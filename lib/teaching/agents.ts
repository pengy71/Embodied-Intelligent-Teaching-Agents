import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';

import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';

import { getStudentAssistantPreferences, getLatestTeachingAgentRun, saveTeachingAgentRun } from './db';
import { buildTeachingStyleProfile, defaultStudentAssistantPreferences } from './student-assistant';
import { buildStudentPortraitScore, buildStudentSnapshot, buildTeacherSnapshot } from './metrics';
import type {
  StudentGuidanceResult,
  StudentPortraitScore,
  TeacherAnalyticsResult,
  TeachingAgentType,
} from './types';

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

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
    if (!match) throw new Error('LLM response did not contain a JSON object');
    return JSON.parse(match[0]) as T;
  }
}

function requireArray<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

function requireString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const STUDENT_GUIDANCE_SCHEMA_VERSION = 4;
const TEACHER_ANALYTICS_SCHEMA_VERSION = 3;

function isStudentGuidanceCache(value: unknown): value is StudentGuidanceResult {
  return (
    isRecord(value) &&
    value.schemaVersion === STUDENT_GUIDANCE_SCHEMA_VERSION &&
    isRecord(value.portrait)
  );
}

function isTeacherAnalyticsCache(value: unknown): value is TeacherAnalyticsResult {
  return (
    isRecord(value) &&
    value.schemaVersion === TEACHER_ANALYTICS_SCHEMA_VERSION &&
    isRecord(value.activity) &&
    Array.isArray(value.completionDistribution) &&
    Array.isArray(value.students)
  );
}

async function saveRun(params: {
  courseId: string;
  studentId?: string;
  agentType: TeachingAgentType;
  input: unknown;
  modelString: string;
  result: unknown;
}) {
  await saveTeachingAgentRun({
    id: `tar-${nanoid(12)}`,
    courseId: params.courseId,
    studentId: params.studentId,
    agentType: params.agentType,
    inputHash: stableHash(params.input),
    modelString: params.modelString,
    result: params.result,
  });
}

export async function getStoredStudentGuidance(params: {
  courseId: string;
  studentId: string;
}): Promise<StudentGuidanceResult | null> {
  const cached = await getLatestTeachingAgentRun<unknown>({
    courseId: params.courseId,
    studentId: params.studentId,
    agentType: 'student-guidance',
  });
  return isStudentGuidanceCache(cached) ? cached : null;
}

export async function runStudentGuidanceAgent(params: {
  courseId: string;
  studentId: string;
  force?: boolean;
}): Promise<StudentGuidanceResult> {
  if (!params.force) {
    const cached = await getLatestTeachingAgentRun<unknown>({
      courseId: params.courseId,
      studentId: params.studentId,
      agentType: 'student-guidance',
    });
    if (isStudentGuidanceCache(cached)) {
      return cached;
    }
  }

  const snapshot = await buildStudentSnapshot(params.courseId, params.studentId);
  const portrait = await buildStudentPortraitScore(params.courseId, params.studentId);
  const preferences =
    (await getStudentAssistantPreferences(params.courseId, params.studentId)) ??
    defaultStudentAssistantPreferences;
  const teachingStyleProfile = buildTeachingStyleProfile(preferences);
  const {
    model,
    modelString,
    thinkingConfig,
  } = await resolveModel({ stage: 'teaching-student-guidance' });

  const promptInput = {
    student: snapshot.student,
    stats: snapshot.stats,
    weakPoints: snapshot.weakPoints.map((item) => ({
      id: item.node.id,
      title: item.node.title,
      chapter: item.node.chapterTitle,
      mastery: item.mastery,
      dependencies: item.node.dependencies,
    })),
    strongPoints: snapshot.strongPoints.map((item) => ({
      id: item.node.id,
      title: item.node.title,
      mastery: item.mastery,
    })),
    path: snapshot.path,
    recentEvents: snapshot.events.slice(-10),
    portrait,
    preferences,
    teachingStyleProfile,
  };

  const system = `你是“个性导学 agent”。你必须基于学习画像、知识图谱、学习事件以及学生设定的教学风格偏好，为学生生成个性化学习路径。
必须严格遵循输入中的 teachingStyleProfile 来选择措辞、节奏、深度与讲解方式。
只输出 JSON，不要 markdown，不要解释。
要求：
- 必须体现因人而异的学习顺序、复习计划和练习建议。
- 建议必须引用输入里的知识点，不要虚构课程外知识点。
- 语言使用简体中文，语气具体、可执行、鼓励但不空泛。`;

  const prompt = `请根据以下真实数据库快照生成导学结果：
${JSON.stringify(promptInput, null, 2)}

输出 JSON 结构：
{
  "guidanceMessage": "一段 100-180 字导学寄语",
  "todayPlan": [
    {"id":"task-1","title":"...","type":"复习|新知|练习|测验","chapter":"...","estimated":"20分钟","reason":"...","targetNodeId":"...","done":false}
  ],
  "report": {
    "status":"学习状态分析",
    "strengths":"优势分析",
    "improvements":"改进建议",
    "nextWeekGoal":"下周目标",
    "investmentLabel":"学习投入评价",
    "masteryLabel":"知识掌握评价",
    "overallComment":"综合评语"
  },
  "adaptationEvents": [
    {"label":"检测到的行为变化","action":"AI 导学调整动作","time":"最近"}
  ]
}`;

  const result = await callLLM(
    { model, system, prompt, maxRetries: 0 },
    'teaching-student-guidance',
    { retries: 1 },
    thinkingConfig,
  );
  const parsed = extractJsonObject<Partial<StudentGuidanceResult>>(result.text);
  const fallbackWeakPoints = snapshot.weakPoints.map((item) => ({
    id: item.node.id,
    title: item.node.title,
    mastery: item.mastery,
    reason: `掌握率 ${item.mastery}%，且与后续知识点存在依赖关系。`,
  }));

  const guidance: StudentGuidanceResult = {
    schemaVersion: STUDENT_GUIDANCE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    modelString,
    stats: snapshot.stats,
    guidanceMessage: requireString(
      parsed.guidanceMessage,
      `${snapshot.student.name}，建议先巩固 ${fallbackWeakPoints[0]?.title ?? '当前薄弱知识点'}，再进入后续任务规划内容。`,
    ),
    weakPoints: fallbackWeakPoints,
    todayPlan: requireArray(parsed.todayPlan, [
      {
        id: 'task-review-1',
        title: `复习：${fallbackWeakPoints[0]?.title ?? '核心概念'}`,
        type: '复习',
        chapter: snapshot.weakPoints[0]?.node.chapterTitle ?? snapshot.path.currentPhase,
        estimated: '20分钟',
        reason: '优先补齐前置知识，降低后续学习阻力。',
        targetNodeId: snapshot.weakPoints[0]?.node.id ?? '',
        done: false,
      },
      {
        id: 'task-practice-1',
        title: `练习：${fallbackWeakPoints[1]?.title ?? '薄弱知识点'}专项`,
        type: '练习',
        chapter: snapshot.weakPoints[1]?.node.chapterTitle ?? snapshot.path.currentPhase,
        estimated: '25分钟',
        reason: '用练习验证概念掌握情况。',
        targetNodeId: snapshot.weakPoints[1]?.node.id ?? '',
        done: false,
      },
    ]),
    path: snapshot.path,
    report: {
      status: requireString(parsed.report?.status, '整体学习处于推进中，需要稳定复习节奏。'),
      strengths: requireString(
        parsed.report?.strengths,
        `优势知识点包括 ${snapshot.strongPoints.map((item) => item.node.title).join('、')}。`,
      ),
      improvements: requireString(
        parsed.report?.improvements,
        `建议重点突破 ${fallbackWeakPoints.slice(0, 3).map((item) => item.title).join('、')}。`,
      ),
      nextWeekGoal: requireString(
        parsed.report?.nextWeekGoal,
        `完成 ${snapshot.path.currentPhase} 的复习和专项练习。`,
      ),
      investmentLabel: requireString(parsed.report?.investmentLabel, '稳定投入'),
      masteryLabel: requireString(parsed.report?.masteryLabel, '稳步提升'),
      overallComment: requireString(parsed.report?.overallComment, '保持节奏，优先处理薄弱依赖链。'),
    },
    adaptationEvents: requireArray(parsed.adaptationEvents, [
      {
        label: '检测到薄弱知识点集中在任务规划链路',
        action: '优先安排前置复习，再进入新知学习',
        time: '最近',
      },
    ]),
    portrait,
  };

  await saveRun({
    courseId: params.courseId,
    studentId: params.studentId,
    agentType: 'student-guidance',
    input: promptInput,
    modelString,
    result: guidance,
  });
  return guidance;
}

export async function getStoredTeacherAnalytics(params: {
  courseId: string;
}): Promise<TeacherAnalyticsResult | null> {
  const cached = await getLatestTeachingAgentRun<unknown>({
    courseId: params.courseId,
    agentType: 'teacher-analytics',
  });
  return isTeacherAnalyticsCache(cached) ? cached : null;
}

export async function runTeacherAnalyticsAgent(params: {
  courseId: string;
  force?: boolean;
}): Promise<TeacherAnalyticsResult> {
  if (!params.force) {
    const cached = await getLatestTeachingAgentRun<unknown>({
      courseId: params.courseId,
      agentType: 'teacher-analytics',
    });
    if (isTeacherAnalyticsCache(cached)) {
      return cached;
    }
  }

  const snapshot = await buildTeacherSnapshot(params.courseId);
  const {
    model,
    modelString,
    thinkingConfig,
  } = await resolveModel({ stage: 'teaching-teacher-analytics' });

  const promptInput = {
    summary: snapshot.summary,
    activity: snapshot.activity,
    completionDistribution: snapshot.completionDistribution,
    chapters: snapshot.chapters,
    students: snapshot.studentRows,
    hotQuestions: snapshot.hotQuestions,
    errorDistribution: snapshot.errorDistribution,
    warningStudents: snapshot.warningStudents,
  };

  const system = `你是“学情分析 agent”。你必须基于班级与个人学习数据形成教学分析结果。
只输出 JSON，不要 markdown，不要解释。
要求：
- 识别共性薄弱知识点和课堂调整依据。
- 建议必须能被教师直接执行，避免泛泛而谈。
- 不得编造输入中没有的学生、知识点或统计数字。`;

  const prompt = `请根据以下真实数据库聚合结果生成教学建议：
${JSON.stringify(promptInput, null, 2)}

输出 JSON 结构：
{
  "suggestions": [
    {"tag":"重点讲解|课堂讨论|差异化教学|练习建议","title":"...","body":"..."}
  ]
}`;

  const result = await callLLM(
    { model, system, prompt, maxRetries: 0 },
    'teaching-teacher-analytics',
    { retries: 1 },
    thinkingConfig,
  );
  const parsed = extractJsonObject<Partial<TeacherAnalyticsResult>>(result.text);
  const weakest = snapshot.errorDistribution[0];

  const analytics: TeacherAnalyticsResult = {
    schemaVersion: TEACHER_ANALYTICS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    modelString,
    summary: snapshot.summary,
    activity: snapshot.activity,
    radar: snapshot.chapters.map((chapter) => ({ name: chapter.title, mastery: chapter.mastery })),
    completionDistribution: snapshot.completionDistribution,
    chapters: snapshot.chapters,
    students: snapshot.studentRows,
    hotQuestions: snapshot.hotQuestions,
    questionTrend: snapshot.questionTrend,
    testDistribution: snapshot.testDistribution,
    errorDistribution: snapshot.errorDistribution,
    warningStudents: snapshot.warningStudents,
    suggestions: requireArray(parsed.suggestions, [
      {
        tag: '重点讲解',
        title: `${weakest?.name ?? '薄弱知识点'}需要加强`,
        body: `该知识点错题/低分比例较高，建议安排 10-15 分钟重新讲解，并补充一个可视化或仿真实验例子。`,
      },
      {
        tag: '差异化教学',
        title: '对预警学生安排补救路径',
        body: `当前有 ${snapshot.warningStudents.length} 名预警学生，建议先补前置概念，再布置小步练习。`,
      },
    ]),
    exportCards: [
      { type: 'grade-sheet', title: '完整成绩单', desc: '包含学习进度、掌握率、测试成绩等全部数据' },
      { type: 'test-report', title: '阶段测试报告', desc: '本次阶段测试的详细成绩与错题分析' },
      { type: 'behavior-stats', title: '学习行为统计', desc: '学习时长、问答记录、练习完成情况' },
    ],
  };

  await saveRun({
    courseId: params.courseId,
    agentType: 'teacher-analytics',
    input: promptInput,
    modelString,
    result: analytics,
  });
  return analytics;
}
