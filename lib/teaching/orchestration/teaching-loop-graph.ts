/**
 * Teaching Closed-Loop Graph — LangGraph StateGraph 编排四大教学智能体联动
 *
 * 闭环拓扑（数据通过 teaching_learning_events 共享存储同步）：
 *
 *   START ──▶ qa ──▶ guidance ──▶ analytics ──▶ teacher_summary ──▶ END
 *              │         │
 *              ▼         ▼
 *            (fatal)   (无数据)
 *              │         │
 *              ▼         ▼
 *             END    teacher_summary
 *
 * 1. qa              提问触发答疑：RAG 答疑 + 记录 qa 学习事件（数据同步起点）
 * 2. guidance        数据同步导学/评测：基于最新学情生成个性化导学 + 靶向练习题
 * 3. analytics       练习数据同步学情分析：聚合班级练习/答疑事件生成学情分析
 * 4. teacher_summary 汇总教师端：综合前三步输出，LLM 合成可执行教学建议并落库
 *
 * 每个节点 best-effort：单智能体失败仅降级，不阻断闭环；仅 qa 在存储不可用时
 * 视为致命错误直接结束。
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { nanoid } from 'nanoid';

import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { resolveModel } from '@/lib/server/resolve-model';
import { runStudentGuidanceAgent, runTeacherAnalyticsAgent } from '@/lib/teaching/agents';
import { insertLearningEvent, saveTeachingAgentRun } from '@/lib/teaching/db';
import { getAllPoints } from '@/lib/teaching/knowledge-doc';
import { generatePracticeQuestions, getStudentWeakPoints } from '@/lib/teaching/practice-agent';
import { runQAAgent } from '@/lib/teaching/qa-agent';
import { saveQARecord } from '@/lib/teaching/qa-history';
import { loadKnowledge } from '@/lib/teaching/store';
import type {
  GeneratedQuestion,
  PracticeWeakPoint,
  QAResult,
  StudentGuidanceResult,
  TeacherAnalyticsResult,
} from '@/lib/teaching/types';

const log = createLogger('TeachingLoopGraph');

// ==================== 类型定义 ====================

export type LoopAgentName = 'qa' | 'guidance' | 'analytics' | 'teacher-summary';

export interface LoopStep {
  agent: LoopAgentName;
  status: 'running' | 'completed' | 'skipped' | 'error';
  title: string;
  detail: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  error?: string;
}

export interface TeacherLoopSummary {
  schemaVersion: number;
  generatedAt: string;
  modelString: string;
  triggerQuestion: string;
  triggerKnowledgePoint: string | null;
  studentSnapshot: {
    studentId: string;
    weakPoints: Array<{ id: string; title: string; mastery: number }>;
    todayPlan: Array<{ id: string; title: string; type: string }>;
  } | null;
  classSnapshot: {
    totalStudents: number;
    averageMastery: number;
    warningCount: number;
    topErrors: Array<{ name: string; value: number }>;
  } | null;
  suggestions: Array<{ tag: string; title: string; body: string }>;
  closedLoop: string;
}

export interface TeachingLoopResult {
  schemaVersion: number;
  generatedAt: string;
  courseId: string;
  studentId: string;
  triggerQuestion: string;
  profile: { teachingStyle?: string; depth?: string };
  qa: QAResult | null;
  qaKnowledgePointId: string | null;
  guidance: StudentGuidanceResult | null;
  practiceQuestions: GeneratedQuestion[] | null;
  analytics: TeacherAnalyticsResult | null;
  studentWeakPoints: PracticeWeakPoint[] | null;
  teacherSummary: TeacherLoopSummary | null;
  steps: LoopStep[];
  errors: string[];
}

export type LoopStreamEvent =
  | { type: 'step'; step: LoopStep }
  | { type: 'result'; result: TeachingLoopResult };

// ==================== 状态定义 ====================

const TeachingLoopState = Annotation.Root({
  courseId: Annotation<string>,
  studentId: Annotation<string>,
  question: Annotation<string>,
  profile: Annotation<{ teachingStyle?: string; depth?: string }>,
  force: Annotation<boolean>,
  qa: Annotation<QAResult | null>,
  qaKnowledgePointId: Annotation<string | null>,
  guidance: Annotation<StudentGuidanceResult | null>,
  practiceQuestions: Annotation<GeneratedQuestion[] | null>,
  analytics: Annotation<TeacherAnalyticsResult | null>,
  studentWeakPoints: Annotation<PracticeWeakPoint[] | null>,
  teacherSummary: Annotation<TeacherLoopSummary | null>,
  steps: Annotation<LoopStep[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),
  fatal: Annotation<boolean>,
});

type LoopState = typeof TeachingLoopState.State;

// ==================== 工具函数 ====================

function extractJsonObject<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM 响应未包含 JSON 对象');
    return JSON.parse(match[0]) as T;
  }
}

function makeStep(
  agent: LoopAgentName,
  status: LoopStep['status'],
  title: string,
  detail: string,
  startedAt: string,
  error?: string,
): LoopStep {
  const finishedAt = new Date().toISOString();
  return {
    agent,
    status,
    title,
    detail,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
    error,
  };
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

// ==================== 节点 1：答疑智能体（提问触发答疑）====================

async function qaNode(state: LoopState): Promise<Partial<LoopState>> {
  const startedAt = new Date().toISOString();
  try {
    const qaResult = await runQAAgent({ question: state.question, profile: state.profile });

    // 从检索来源中定位知识点，用于后续数据同步
    const knowledgePointId =
      qaResult.sources.find((s) => s.pointId)?.pointId ??
      qaResult.relatedPoints[0]?.id ??
      null;

    // 数据同步：将本次答疑落为 qa 学习事件，供导学/学情分析消费
    let recordedNodeId: string | null = knowledgePointId;
    if (!recordedNodeId) {
      try {
        const doc = await loadKnowledge();
        recordedNodeId = getAllPoints(doc)[0]?.id ?? null;
      } catch {
        recordedNodeId = null;
      }
    }
    if (recordedNodeId) {
      try {
        await insertLearningEvent({
          courseId: state.courseId,
          studentId: state.studentId,
          eventType: 'qa',
          knowledgeNodeId: recordedNodeId,
          score: null,
          durationMinutes: 5,
          payload: {
            question: state.question,
            sourceCount: qaResult.sources.length,
            triggeredLoop: true,
          },
        });
      } catch (err) {
        log.warn({ err: err instanceof Error ? err.message : String(err) }, '[qa] 记录学习事件失败');
      }
    }

    // 持久化答疑历史（与 /api/teaching/qa 行为一致）
    void saveQARecord({
      studentId: state.studentId,
      question: state.question,
      answer: qaResult.answer,
      sources: qaResult.sources,
      relatedPoints: qaResult.relatedPoints,
      profile: state.profile,
    }).catch((err) => log.warn({ err }, '[qa] 保存历史失败'));

    return {
      qa: qaResult,
      qaKnowledgePointId: knowledgePointId,
      steps: [
        makeStep(
          'qa',
          'completed',
          '答疑智能体',
          `已基于教材原文回答，命中 ${qaResult.sources.length} 条来源${
            knowledgePointId ? `，关联知识点 ${knowledgePointId}` : ''
          }`,
          startedAt,
        ),
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, '[qa] 答疑智能体失败');
    return {
      qa: null,
      fatal: true,
      steps: [makeStep('qa', 'error', '答疑智能体', '答疑失败，闭环终止', startedAt, message)],
      errors: [`qa: ${message}`],
    };
  }
}

// ==================== 节点 2：导学/评测智能体（数据同步导学/评测）====================

async function guidanceNode(state: LoopState): Promise<Partial<LoopState>> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // 导学：基于最新学情（含刚记录的 qa 事件）生成个性化学习路径
  let guidance: StudentGuidanceResult | null = null;
  try {
    guidance = await runStudentGuidanceAgent({
      courseId: state.courseId,
      studentId: state.studentId,
      force: state.force,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`guidance: ${message}`);
    log.warn({ err: message }, '[guidance] 导学失败，尝试缓存');
    try {
      guidance = await runStudentGuidanceAgent({
        courseId: state.courseId,
        studentId: state.studentId,
        force: false,
      });
    } catch (err2) {
      errors.push(`guidance-cache: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
  }

  // 评测：聚合薄弱知识点（含本次答疑知识点）生成靶向练习题
  let practiceQuestions: GeneratedQuestion[] | null = null;
  let weakPoints: PracticeWeakPoint[] = [];
  try {
    weakPoints = await getStudentWeakPoints(state.courseId, state.studentId);
    const weakPointIds = dedupe(
      [state.qaKnowledgePointId, ...weakPoints.map((w) => w.id)].filter(
        (x): x is string => Boolean(x),
      ),
    );
    const generated = await generatePracticeQuestions({
      courseId: state.courseId,
      studentId: state.studentId,
      mode: 'adaptive',
      count: 3,
      weakPointIds,
    });
    practiceQuestions = generated.questions;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`practice: ${message}`);
    log.warn({ err: message }, '[guidance] 练习题生成失败');
  }

  const detail =
    (guidance ? '已生成个性化导学路径' : '导学降级') +
    '；' +
    (practiceQuestions?.length
      ? `已生成 ${practiceQuestions.length} 道靶向练习题`
      : '练习题生成失败');

  return {
    guidance,
    practiceQuestions,
    studentWeakPoints: weakPoints,
    steps: [
      makeStep(
        'guidance',
        practiceQuestions || guidance ? 'completed' : 'error',
        '导学/评测智能体',
        detail,
        startedAt,
      ),
    ],
    errors,
  };
}

// ==================== 节点 3：学情分析智能体（练习数据同步学情分析）====================

async function analyticsNode(state: LoopState): Promise<Partial<LoopState>> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let analytics: TeacherAnalyticsResult | null = null;
  try {
    analytics = await runTeacherAnalyticsAgent({ courseId: state.courseId, force: state.force });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`analytics: ${message}`);
    log.warn({ err: message }, '[analytics] 学情分析失败，尝试缓存');
    try {
      analytics = await runTeacherAnalyticsAgent({ courseId: state.courseId, force: false });
    } catch (err2) {
      errors.push(`analytics-cache: ${err2 instanceof Error ? err2.message : String(err2)}`);
    }
  }
  const detail = analytics
    ? `已聚合班级学情：${analytics.summary.totalStudents} 名学生，平均掌握度 ${analytics.summary.averageMastery}%，预警 ${analytics.summary.warningCount} 人`
    : '学情分析降级';
  return {
    analytics,
    steps: [
      makeStep(
        'analytics',
        analytics ? 'completed' : 'error',
        '学情分析智能体',
        detail,
        startedAt,
      ),
    ],
    errors,
  };
}

// ==================== 节点 4：教师汇总智能体（汇总教师端）====================

async function buildTeacherSummary(state: LoopState): Promise<TeacherLoopSummary> {
  const weakPoints = (state.studentWeakPoints ?? []).slice(0, 5).map((w) => ({
    id: w.id,
    title: w.title,
    mastery: w.mastery,
  }));
  const todayPlan = (state.guidance?.todayPlan ?? []).slice(0, 4).map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
  }));
  const classSnapshot = state.analytics
    ? {
        totalStudents: state.analytics.summary.totalStudents,
        averageMastery: state.analytics.summary.averageMastery,
        warningCount: state.analytics.summary.warningCount,
        topErrors: state.analytics.errorDistribution.slice(0, 5),
      }
    : null;

  const promptInput = {
    triggerQuestion: state.question,
    triggerKnowledgePoint: state.qaKnowledgePointId,
    studentWeakPoints: weakPoints,
    studentTodayPlan: todayPlan,
    classSummary: classSnapshot,
    guidanceMessage: state.guidance?.guidanceMessage ?? null,
    hotQuestions: state.analytics?.hotQuestions.slice(0, 5) ?? [],
  };

  let suggestions: Array<{ tag: string; title: string; body: string }> = [];
  let modelString = 'rule-based';

  try {
    const { model, thinkingConfig } = await resolveModel({ stage: 'teaching-teacher-summary' });
    modelString = 'resolved';
    const system = `你是"教师汇总智能体"。请基于闭环中前三步（答疑、导学/评测、学情分析）的真实数据，为教师合成可直接执行的教学建议。
只输出 JSON，不要 markdown，不要解释。
要求：
- 建议必须落在输入数据范围内，不得编造未出现的学生、知识点或统计数字。
- 每条建议 tag 取自：重点讲解|课堂讨论|差异化教学|练习建议|学习预警。
- 语言使用简体中文，具体、可执行。`;

    const prompt = `请根据以下闭环数据合成教师端汇总建议：
${JSON.stringify(promptInput, null, 2)}

输出 JSON 结构：
{"suggestions":[{"tag":"...","title":"...","body":"..."}]}`;

    const result = await callLLM(
      { model, system, prompt, maxRetries: 0 },
      'teaching-teacher-summary',
      { retries: 1 },
      thinkingConfig,
    );
    const parsed = extractJsonObject<{ suggestions?: unknown[] }>(result.text);
    if (Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .slice(0, 5)
        .map((o) => ({
          tag: typeof o.tag === 'string' ? o.tag : '教学建议',
          title: typeof o.title === 'string' ? o.title : '关注班级学情',
          body: typeof o.body === 'string' ? o.body : '请结合学情数据调整教学节奏。',
        }));
    }
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      '[teacher-summary] LLM 失败，使用规则兜底',
    );
  }

  // 规则兜底建议
  if (suggestions.length === 0) {
    const topError = classSnapshot?.topErrors[0];
    suggestions = [
      {
        tag: '重点讲解',
        title: topError ? `${topError.name} 错误率偏高` : '关注共性薄弱知识点',
        body: topError
          ? `该知识点错误度达 ${topError.value}%，建议安排 10-15 分钟重讲并补充可视化示例。`
          : '建议结合本次答疑热点安排专题复习。',
      },
    ];
    if (classSnapshot && classSnapshot.warningCount > 0) {
      suggestions.push({
        tag: '学习预警',
        title: `${classSnapshot.warningCount} 名学生进入预警`,
        body: '建议优先补齐前置概念，再布置小步练习巩固。',
      });
    }
    if (weakPoints.length > 0) {
      suggestions.push({
        tag: '差异化教学',
        title: '针对提问学生个性化辅导',
        body: `该生薄弱点集中在：${weakPoints.map((w) => w.title).join('、')}，建议优先复习前置依赖。`,
      });
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    modelString,
    triggerQuestion: state.question,
    triggerKnowledgePoint: state.qaKnowledgePointId,
    studentSnapshot: {
      studentId: state.studentId,
      weakPoints,
      todayPlan,
    },
    classSnapshot,
    suggestions,
    closedLoop: '提问触发答疑 -> 数据同步导学/评测 -> 练习数据同步学情分析 -> 汇总教师端',
  };
}

async function teacherSummaryNode(state: LoopState): Promise<Partial<LoopState>> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let teacherSummary: TeacherLoopSummary | null = null;
  try {
    teacherSummary = await buildTeacherSummary(state);

    // 落库供教师端读取最新闭环汇总
    try {
      await saveTeachingAgentRun({
        id: `tar-${nanoid(12)}`,
        courseId: state.courseId,
        agentType: 'teacher-summary',
        inputHash: state.question,
        modelString: teacherSummary.modelString,
        result: teacherSummary,
      });
    } catch (err) {
      errors.push(`summary-persist: ${err instanceof Error ? err.message : String(err)}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`teacher-summary: ${message}`);
    log.error({ err: message }, '[teacher-summary] 汇总失败');
  }

  return {
    teacherSummary,
    steps: [
      makeStep(
        'teacher-summary',
        teacherSummary ? 'completed' : 'error',
        '教师汇总智能体',
        teacherSummary
          ? `已汇总 ${teacherSummary.suggestions.length} 条教学建议并同步至教师端`
          : '教师汇总失败',
        startedAt,
      ),
    ],
    errors,
  };
}

// ==================== 路由条件 ====================

function routeAfterQa(state: LoopState): string {
  // qa 为闭环起点，存储不可用等致命错误时直接结束
  return state.fatal ? END : 'guidance';
}

function routeAfterGuidance(state: LoopState): string {
  // 导学与评测全部失败时跳过学情分析，直接汇总
  if (!state.guidance && !state.practiceQuestions) {
    return 'teacher-summary';
  }
  return 'analytics';
}

// ==================== 图构建 ====================

export function createTeachingLoopGraph() {
  const graph = new StateGraph(TeachingLoopState)
    .addNode('qa', qaNode)
    .addNode('guidance', guidanceNode)
    .addNode('analytics', analyticsNode)
    .addNode('teacher-summary', teacherSummaryNode)
    .addEdge(START, 'qa')
    .addConditionalEdges('qa', routeAfterQa, {
      guidance: 'guidance',
      [END]: END,
    })
    .addConditionalEdges('guidance', routeAfterGuidance, {
      analytics: 'analytics',
      'teacher-summary': 'teacher-summary',
    })
    .addEdge('analytics', 'teacher-summary')
    .addEdge('teacher-summary', END);

  return graph.compile();
}

// ==================== 执行入口 ====================

export interface InvokeTeachingLoopParams {
  courseId: string;
  studentId: string;
  question: string;
  profile?: { teachingStyle?: string; depth?: string };
  force?: boolean;
}

function buildInitialState(params: InvokeTeachingLoopParams): LoopState {
  return {
    courseId: params.courseId,
    studentId: params.studentId,
    question: params.question,
    profile: params.profile ?? {},
    force: params.force ?? true,
    qa: null,
    qaKnowledgePointId: null,
    guidance: null,
    practiceQuestions: null,
    analytics: null,
    studentWeakPoints: null,
    teacherSummary: null,
    steps: [],
    errors: [],
    fatal: false,
  };
}

function toResult(state: LoopState): TeachingLoopResult {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    courseId: state.courseId,
    studentId: state.studentId,
    triggerQuestion: state.question,
    profile: state.profile,
    qa: state.qa,
    qaKnowledgePointId: state.qaKnowledgePointId,
    guidance: state.guidance,
    practiceQuestions: state.practiceQuestions,
    analytics: state.analytics,
    studentWeakPoints: state.studentWeakPoints,
    teacherSummary: state.teacherSummary,
    steps: state.steps,
    errors: state.errors,
  };
}

/** 一次性运行完整闭环并返回聚合结果。 */
export async function invokeTeachingLoop(
  params: InvokeTeachingLoopParams,
): Promise<TeachingLoopResult> {
  const graph = createTeachingLoopGraph();
  const finalState = await graph.invoke(buildInitialState(params));
  return toResult(finalState);
}

/** 流式运行闭环：每完成一个智能体产出一条 step 事件，最后产出 result 事件。 */
export async function* streamTeachingLoop(
  params: InvokeTeachingLoopParams,
): AsyncGenerator<LoopStreamEvent> {
  const graph = createTeachingLoopGraph();
  const initial = buildInitialState(params);
  let state = initial;
  const stream = await graph.stream(initial, { streamMode: 'updates' });
  for await (const chunk of stream) {
    for (const update of Object.values(chunk as Record<string, unknown>)) {
      if (update && typeof update === 'object') {
        const partial = update as Partial<LoopState>;
        const merged: LoopState = { ...state, ...partial };
        // reducer 字段需累加，不能被 spread 覆盖
        if (partial.steps?.length) {
          merged.steps = [...state.steps, ...partial.steps];
          for (const step of partial.steps) {
            yield { type: 'step', step };
          }
        }
        if (partial.errors?.length) {
          merged.errors = [...state.errors, ...partial.errors];
        }
        state = merged;
      }
    }
  }
  yield { type: 'result', result: toResult(state) };
}