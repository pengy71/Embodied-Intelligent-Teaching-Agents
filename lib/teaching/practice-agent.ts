// 习题评测智能体：LLM 多题型出题 -> 提交后错题归因 -> 训练报告 + 同类变式题。
// 复用 callLLM/resolveModel 编排范式与 teaching_learning_events 持久化。

import { nanoid } from 'nanoid';

import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';
import { createLogger } from '@/lib/logger';
import { loadKnowledge, getResourcesForPoint } from '@/lib/teaching/store';
import {
  getAllPoints,
  getPoint,
  getPointChapter,
  getMistake,
  type KnowledgeDoc,
  type KnowledgePoint,
} from '@/lib/teaching/knowledge-doc';
import { getLearningEvents, insertLearningEvent } from '@/lib/teaching/db';
import type {
  AttributionCause,
  ErrorAttribution,
  GeneratedQuestion,
  GradedQuestion,
  PracticeDifficulty,
  PracticeMode,
  PracticeQuestionType,
  PracticeReport,
  PracticeRound,
  PracticeWeakPoint,
  TeachingLearningEvent,
} from '@/lib/teaching/types';

const log = createLogger('TeachingPracticeAgent');

const VALID_TYPES: PracticeQuestionType[] = ['choice', 'fill', 'short', 'case', 'algorithm'];
const VALID_DIFFICULTIES: PracticeDifficulty[] = ['easy', 'medium', 'hard'];
const SUBJECTIVE: PracticeQuestionType[] = ['short', 'case', 'algorithm'];

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

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

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function requireStr(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeType(value: unknown): PracticeQuestionType {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'single' || v === 'choice' || v === '选择题' || v === '选择') return 'choice';
  if (v === 'fill' || v === '填空' || v === '填空题') return 'fill';
  if (v === 'short' || v === '简答' || v === '简答题') return 'short';
  if (v === 'case' || v === '案例' || v === '案例分析') return 'case';
  if (v === 'algorithm' || v === '算法' || v === '算法设计') return 'algorithm';
  return 'choice';
}

function normalizeDifficulty(value: unknown, mode: PracticeMode): PracticeDifficulty {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'easy' || v === '简单' || v === '基础') return 'easy';
  if (v === 'hard' || v === '困难' || v === '较难' || v === '挑战') return 'hard';
  if (v === 'medium' || v === '中等' || v === '标准') return 'medium';
  return mode === 'special' ? 'hard' : mode === 'test' ? 'medium' : 'easy';
}

function normalizeFillText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。、,.!?；;:：""''()（）]/g, '');
}

function normalizeCause(value: unknown): AttributionCause {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (v === 'concept-confusion' || v.includes('概念')) return 'concept-confusion';
  if (v === 'formula-misuse' || v.includes('公式')) return 'formula-misuse';
  if (v === 'logic-gap' || v.includes('逻辑')) return 'logic-gap';
  if (v === 'careless' || v.includes('粗心') || v.includes('失误')) return 'careless';
  return 'other';
}

function strategyFor(mode: PracticeMode): string {
  if (mode === 'adaptive') return '优先覆盖薄弱知识点，并补充其前置知识';
  if (mode === 'special') return '围绕高频易错点生成专项练习';
  if (mode === 'test') return '均衡覆盖各章节与三级难度，模拟阶段测试';
  return '按章节知识图谱顺序生成练习';
}

// ---------------------------------------------------------------------------
// 选点与上下文
// ---------------------------------------------------------------------------

interface PointContext {
  index: number;
  pointId: string;
  title: string;
  chapter: string;
  summary: string;
  originalText: string;
  commonMistakes: string;
}

async function deriveWeakPointIds(courseId: string, studentId: string): Promise<string[]> {
  try {
    const events = await getLearningEvents(courseId, studentId);
    const low = events.filter(
      (e) =>
        (e.eventType === 'practice' || e.eventType === 'quiz') &&
        typeof e.score === 'number' &&
        e.score < 60,
    );
    const counts = new Map<string, number>();
    for (const e of low) counts.set(e.knowledgeNodeId, (counts.get(e.knowledgeNodeId) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);
  } catch {
    return [];
  }
}

async function choosePointIds(
  doc: KnowledgeDoc,
  allPoints: KnowledgePoint[],
  params: {
    mode: PracticeMode;
    courseId: string;
    studentId: string;
    weakPointIds?: string[];
    chapterId?: string;
    chapterIds?: string[];
  },
): Promise<string[]> {
  const mode = params.mode;
  const known = new Set(allPoints.map((p) => p.id));
  const explicit = (params.weakPointIds ?? []).filter((id) => known.has(id));

  if (mode === 'chapter') {
    const inChapter = params.chapterId
      ? allPoints.filter((p) => getPointChapter(doc, p.id)?.id === params.chapterId)
      : allPoints;
    return dedupe([...inChapter.map((p) => p.id), ...allPoints.map((p) => p.id)]);
  }
  if (mode === 'special') {
    const mistakePoints = allPoints.filter((p) => (p.mistakes?.length ?? 0) > 0);
    return dedupe([...mistakePoints.map((p) => p.id), ...allPoints.map((p) => p.id)]);
  }
  if (mode === 'adaptive') {
    const weak = (await deriveWeakPointIds(params.courseId, params.studentId)).filter((id) =>
      known.has(id),
    );
    return dedupe([...explicit, ...weak, ...allPoints.map((p) => p.id)]);
  }
  // test：在指定章节范围内均衡取点（未指定则覆盖全部章节）
  const chapterFilter = new Set(params.chapterIds ?? []);
  const scopePoints =
    chapterFilter.size > 0
      ? allPoints.filter((p) => chapterFilter.has(getPointChapter(doc, p.id)?.id ?? ''))
      : allPoints;
  const stride = Math.max(1, Math.floor(scopePoints.length / 12));
  const spread: string[] = [];
  for (let i = 0; i < scopePoints.length; i += stride) spread.push(scopePoints[i].id);
  return dedupe([...spread, ...scopePoints.map((p) => p.id)]);
}

async function buildPointContext(
  doc: KnowledgeDoc,
  point: KnowledgePoint,
  index: number,
): Promise<PointContext> {
  const chapter = getPointChapter(doc, point.id);
  let originalText = '';
  try {
    const excerpts = await getResourcesForPoint(point.id, 3000, 2);
    originalText = excerpts.map((r) => `【${r.name}】\n${r.excerpt}`).join('\n\n');
  } catch {
    originalText = '';
  }
  const mistakes = (point.mistakes ?? [])
    .map((id) => getMistake(doc, id))
    .filter((m) => Boolean(m))
    .map((m) => `- 常见错误：${m!.wrong}\n  正确理解：${m!.right}`);
  return {
    index: index + 1,
    pointId: point.id,
    title: point.title,
    chapter: chapter?.title ?? '',
    summary: point.summary ?? '',
    originalText,
    commonMistakes: mistakes.join('\n'),
  };
}

// ---------------------------------------------------------------------------
// 题目规范化
// ---------------------------------------------------------------------------

function normalizeQuestions(
  raw: unknown,
  seedPoints: KnowledgePoint[],
  mode: PracticeMode,
  roundId: string,
  doc: KnowledgeDoc,
): GeneratedQuestion[] {
  if (!Array.isArray(raw)) return [];
  const knownIds = new Set(getAllPoints(doc).map((p) => p.id));
  const out: GeneratedQuestion[] = [];
  let qIndex = 0;

  for (const item of raw) {
    if (!isRecord(item)) continue;
    const type = normalizeType(item.type);
    const difficulty = normalizeDifficulty(item.difficulty, mode);
    const question = requireStr(item.question);
    if (!question) continue;

    const fallbackPointId = seedPoints[Math.min(qIndex, seedPoints.length - 1)]?.id;
    const pointId =
      typeof item.pointId === 'string' && knownIds.has(item.pointId)
        ? item.pointId
        : fallbackPointId;
    if (!pointId) continue;
    const point = getPoint(doc, pointId);
    if (!point) continue;
    const chapter = getPointChapter(doc, pointId);
    const explanation =
      requireStr(item.explanation) ?? point.summary ?? `本题考查知识点"${point.title}"。`;
    const common = {
      id: `${roundId}-q${qIndex + 1}`,
      difficulty,
      question,
      explanation,
      pointId,
      pointTitle: point.title,
      chapter: chapter?.title ?? '课程知识体系',
      source: `课程知识库 · ${chapter?.title ?? '知识点原文'}`,
    };

    let q: GeneratedQuestion | undefined;
    if (type === 'choice') {
      const options = Array.isArray(item.options)
        ? (item.options as unknown[]).map((o) => String(o).trim()).filter(Boolean)
        : [];
      if (options.length < 2) continue;
      let answer =
        typeof item.answer === 'number'
          ? item.answer
          : typeof item.answer === 'string'
            ? Number(item.answer)
            : NaN;
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) answer = 0;
      q = { ...common, type: 'choice', options, answer };
    } else if (type === 'fill') {
      const acceptable = Array.isArray(item.acceptableAnswers)
        ? (item.acceptableAnswers as unknown[]).map((o) => String(o).trim()).filter(Boolean)
        : [];
      const ans = typeof item.answer === 'string' ? item.answer.trim() : '';
      const answers = acceptable.length > 0 ? acceptable : ans ? [ans] : [];
      if (answers.length === 0) continue;
      q = { ...common, type: 'fill', acceptableAnswers: answers, answer: answers[0] };
    } else {
      const referenceAnswer = requireStr(item.referenceAnswer);
      if (!referenceAnswer) continue;
      const gradingCriteria = requireStr(item.gradingCriteria) ?? '关键概念与步骤正确即得分。';
      q = { ...common, type, referenceAnswer, gradingCriteria };
    }

    if (q) {
      out.push(q);
      qIndex++;
    }
  }
  return out;
}

function buildFallbackQuestion(
  point: KnowledgePoint,
  index: number,
  allPoints: KnowledgePoint[],
  doc: KnowledgeDoc,
  mode: PracticeMode,
  roundId: string,
): GeneratedQuestion {
  const chapter = getPointChapter(doc, point.id);
  const relatedTitles = (point.related ?? [])
    .map((id) => allPoints.find((p) => p.id === id)?.title)
    .filter(Boolean) as string[];
  const distractors = allPoints
    .filter((p) => p.id !== point.id && !relatedTitles.includes(p.title))
    .slice(index + 1, index + 4)
    .map((p) => p.title);
  const options = [point.title, ...distractors].slice(0, 4);
  while (options.length < 4) options.push(`其他课程知识点 ${options.length + 1}`);
  return {
    id: `${roundId}-q${index + 1}`,
    type: 'choice',
    difficulty: mode === 'special' ? 'hard' : mode === 'test' ? 'medium' : 'easy',
    question: `关于"${point.title}"，以下哪一项最符合课程知识库中的核心表述？`,
    options,
    answer: 0,
    explanation:
      point.summary || `该题考查知识点"${point.title}"及其在具身智能课程中的基本含义。`,
    pointId: point.id,
    pointTitle: point.title,
    chapter: chapter?.title ?? '课程知识体系',
    source: `课程知识库 · ${chapter?.title ?? '知识点原文'}`,
  };
}

// ---------------------------------------------------------------------------
// 1) 出题
// ---------------------------------------------------------------------------

export async function generatePracticeQuestions(params: {
  courseId: string;
  studentId: string;
  mode: PracticeMode;
  count?: number;
  weakPointIds?: string[];
  chapterId?: string;
  chapterIds?: string[];
}): Promise<{
  roundId: string;
  questions: GeneratedQuestion[];
  strategy: string;
  generatedAt: string;
  modelString: string;
  degraded: boolean;
}> {
  const mode = params.mode;
  const count = Math.min(Math.max(params.count ?? 5, 1), 10);
  const roundId = `pr-${nanoid(10)}`;
  const doc = await loadKnowledge();
  const allPoints = getAllPoints(doc);

  const pointIds = await choosePointIds(doc, allPoints, params);
  const points = pointIds
    .map((id) => getPoint(doc, id))
    .filter((p): p is KnowledgePoint => Boolean(p));
  if (points.length === 0) {
    return {
      roundId,
      questions: [],
      strategy: '暂无可用知识点',
      generatedAt: new Date().toISOString(),
      modelString: '',
      degraded: true,
    };
  }

  const selected = points.slice(0, count);
  const contexts = await Promise.all(selected.map((p, i) => buildPointContext(doc, p, i)));
  const strategy = strategyFor(mode);
  let modelString = '';

  try {
    const { model, modelString: ms, thinkingConfig } = await resolveModel({
      stage: 'teaching-practice',
    });
    modelString = ms;
    const system = buildGenerateSystem(mode);
    const prompt = buildGenerateUser(mode, count, contexts);
    const result = await callLLM(
      { model, system, prompt, maxRetries: 0 },
      'teaching-practice-generate',
      { retries: 1 },
      thinkingConfig,
    );
    const parsed = extractJsonObject<{ questions: unknown[] }>(result.text);
    const questions = normalizeQuestions(parsed.questions, selected, mode, roundId, doc);
    if (questions.length > 0) {
      return {
        roundId,
        questions,
        strategy,
        generatedAt: new Date().toISOString(),
        modelString,
        degraded: false,
      };
    }
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'LLM 出题失败，降级为硬编码题目',
    );
  }

  const fallback = selected.map((p, i) =>
    buildFallbackQuestion(p, i, allPoints, doc, mode, roundId),
  );
  return {
    roundId,
    questions: fallback,
    strategy: `${strategy}（降级模式）`,
    generatedAt: new Date().toISOString(),
    modelString,
    degraded: true,
  };
}

function buildGenerateSystem(mode: PracticeMode): string {
  const typeHint =
    mode === 'test'
      ? '选择题、填空题、简答题、案例分析、算法设计应均衡出现'
      : mode === 'special'
        ? '以易错点为靶心，多用简答/案例/算法题考查深层理解'
        : '以选择/填空为主，适当搭配 1-2 道简答或案例题';
  return `你是具身智能课程的"习题评测智能体"。请基于给定的知识点与教材原文，生成高质量练习题。

要求：
1. 仅输出一个 JSON 对象，不要 markdown、不要解释。结构为 {"questions":[...]}。
2. 题型从 choice(选择)/fill(填空)/short(简答)/case(案例)/algorithm(算法) 中选取，本组题目：${typeHint}。
3. 每题需标注 difficulty：easy(简单)/medium(中等)/hard(困难)，整组应覆盖至少两级难度。
4. 题干、选项、答案必须依据提供的教材原文与知识点，不得编造课程外的内容。
5. 每道题的 pointId 必须从给定的知识点列表中选取。
6. choice 题提供 options(2-4 项)与 answer(正确选项索引)；fill 题提供 acceptableAnswers(可接受的等价答案)；short/case/algorithm 题提供 referenceAnswer(参考答案)与 gradingCriteria(评分要点)。
7. 每题附 explanation(解析)，简明说明考查点。
8. 语言使用简体中文，表述严谨。`;
}

function buildGenerateUser(mode: PracticeMode, count: number, contexts: PointContext[]): string {
  const blocks = contexts
    .map((c) => {
      const parts = [
        `[知识点 ${c.index}]`,
        `pointId: ${c.pointId}`,
        `标题: ${c.title}`,
        `章节: ${c.chapter}`,
      ];
      if (c.summary) parts.push(`摘要: ${c.summary}`);
      if (c.originalText) parts.push(`教材原文:\n${c.originalText}`);
      if (c.commonMistakes) parts.push(`常见错误:\n${c.commonMistakes}`);
      return parts.join('\n');
    })
    .join('\n\n');

  return `练习模式: ${mode}
需要生成题目数: ${count}

可用知识点与原文：
${blocks}

请基于以上知识点生成 ${count} 道练习题，仅输出 JSON：
{"questions":[{"type":"choice","difficulty":"easy","question":"题干","options":["A","B","C","D"],"answer":0,"explanation":"解析","pointId":"知识点id"}, {"type":"fill","difficulty":"medium","question":"题干","acceptableAnswers":["答案"],"explanation":"解析","pointId":"知识点id"}, {"type":"short","difficulty":"hard","question":"题干","referenceAnswer":"参考答案","gradingCriteria":"评分要点","explanation":"解析","pointId":"知识点id"}]}`;
}

// ---------------------------------------------------------------------------
// 2) 判分 + 错题归因
// ---------------------------------------------------------------------------

export async function gradeAndAttribution(params: {
  courseId: string;
  studentId: string;
  roundId: string;
  questions: GeneratedQuestion[];
  answers: Record<string, number | string | null | undefined>;
  eventType?: 'practice' | 'quiz';
  testId?: string;
}): Promise<PracticeRound> {
  const { courseId, studentId, roundId, questions, answers } = params;
  const eventType = params.eventType === 'quiz' ? 'quiz' : 'practice';
  const testId = params.testId;
  const doc = await loadKnowledge();

  // 1. 客观题判分（主观题先占位）
  const graded: GradedQuestion[] = questions.map((q) => gradeObjective(q, answers[q.id]));

  // 2. 主观题 LLM 批量评阅
  const subjective = graded.filter(
    (g) => SUBJECTIVE.includes(g.question.type) && g.studentAnswer !== null,
  );
  let gradeModelString = '';
  if (subjective.length > 0) {
    try {
      const { model, modelString: ms, thinkingConfig } = await resolveModel({
        stage: 'teaching-practice',
      });
      gradeModelString = ms;
      const system = buildGradeSystem();
      const prompt = buildGradeUser(subjective);
      const result = await callLLM(
        { model, system, prompt, maxRetries: 0 },
        'teaching-practice-grade',
        { retries: 1 },
        thinkingConfig,
      );
      const parsed = extractJsonObject<{ results: unknown[] }>(result.text);
      applySubjectiveScores(graded, parsed.results);
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '主观题 LLM 评阅失败，标记为需自评',
      );
      for (const g of subjective) {
        g.score = 0;
        g.passed = false;
        g.feedback = '自动评阅暂不可用，请对照参考答案自评。';
      }
    }
  }

  // 3. 错题归因 LLM 批量
  const wrongGraded = graded.filter((g) => !g.passed);
  if (wrongGraded.length > 0) {
    try {
      const { model, thinkingConfig } = await resolveModel({ stage: 'teaching-practice' });
      const system = buildAttributionSystem();
      const prompt = buildAttributionUser(doc, wrongGraded);
      const result = await callLLM(
        { model, system, prompt, maxRetries: 0 },
        'teaching-practice-attribute',
        { retries: 1 },
        thinkingConfig,
      );
      const parsed = extractJsonObject<{ attributions: unknown[] }>(result.text);
      applyAttributions(graded, parsed.attributions, doc);
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '错题归因 LLM 失败，规则兜底',
      );
      for (const g of wrongGraded) g.attribution = ruleAttribution(g, doc);
    }
  }

  // 4. 记录 learning events
  await recordPracticeEvents(courseId, studentId, roundId, graded, eventType, testId);

  // 5. 生成报告
  const report = buildReport(roundId, graded, gradeModelString);
  return { roundId, gradedQuestions: graded, report };
}

function gradeObjective(
  q: GeneratedQuestion,
  studentAnswer: number | string | null | undefined,
): GradedQuestion {
  const answered = studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

  if (q.type === 'choice') {
    const ans = typeof studentAnswer === 'number' ? studentAnswer : Number(studentAnswer);
    const correct = answered && Number.isInteger(ans) && ans === q.answer;
    return {
      question: q,
      studentAnswer: answered ? ans : null,
      score: correct ? 100 : 0,
      passed: correct,
    };
  }
  if (q.type === 'fill') {
    const text = answered ? String(studentAnswer).trim() : '';
    const correct =
      answered &&
      (q.acceptableAnswers ?? []).some((a) => normalizeFillText(a) === normalizeFillText(text));
    return {
      question: q,
      studentAnswer: answered ? text : null,
      score: correct ? 100 : 0,
      passed: correct,
    };
  }
  // 主观题：先占位，等 LLM 评阅
  if (!answered) {
    return { question: q, studentAnswer: null, score: 0, passed: false, feedback: '未作答。' };
  }
  return { question: q, studentAnswer: String(studentAnswer), score: 0, passed: false };
}

function applySubjectiveScores(graded: GradedQuestion[], results: unknown): void {
  if (!Array.isArray(results)) return;
  const map = new Map<string, { score: number; feedback: string }>();
  for (const r of results) {
    if (!isRecord(r)) continue;
    const id = typeof r.id === 'string' ? r.id : '';
    const rawScore = typeof r.score === 'number' ? r.score : Number(r.score);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, Math.round(rawScore)))
      : 0;
    const feedback = typeof r.feedback === 'string' ? r.feedback : '';
    if (id) map.set(id, { score, feedback });
  }
  for (const g of graded) {
    if (!SUBJECTIVE.includes(g.question.type)) continue;
    if (g.studentAnswer === null) continue; // 未作答已处理
    const r = map.get(g.question.id);
    const score = r?.score ?? 0;
    g.score = score;
    g.passed = score >= 60;
    g.feedback = r?.feedback || '作答已记录，请参考下方参考答案对照。';
  }
}

function applyAttributions(
  graded: GradedQuestion[],
  raw: unknown,
  doc: KnowledgeDoc,
): void {
  if (!Array.isArray(raw)) return;
  const knownIds = new Set(getAllPoints(doc).map((p) => p.id));
  const map = new Map<string, ErrorAttribution>();
  for (const r of raw) {
    if (!isRecord(r)) continue;
    const id = typeof r.id === 'string' ? r.id : '';
    const cause = normalizeCause(r.cause);
    const explanation = requireStr(r.explanation) ?? '建议回顾相关知识点后再练。';
    const reviewRaw = Array.isArray(r.reviewPointIds) ? r.reviewPointIds : [];
    const reviewStrings = reviewRaw.filter((x): x is string => typeof x === 'string');
    const reviewPointIds = dedupe(reviewStrings.filter((id) => knownIds.has(id)));
    if (id) map.set(id, { cause, explanation, reviewPointIds });
  }
  for (const g of graded) {
    if (g.passed) continue;
    const a = map.get(g.question.id);
    g.attribution = a && a.reviewPointIds.length > 0 ? a : ruleAttribution(g, doc);
  }
}

function fallbackReviewIds(g: GradedQuestion, doc: KnowledgeDoc): string[] {
  const point = getPoint(doc, g.question.pointId);
  return dedupe([
    g.question.pointId,
    ...(point?.prerequisites ?? []),
    ...(point?.related ?? []),
  ]).filter((id) => Boolean(getPoint(doc, id)));
}

function ruleAttribution(g: GradedQuestion, doc: KnowledgeDoc): ErrorAttribution {
  const point = getPoint(doc, g.question.pointId);
  const reviewPointIds = fallbackReviewIds(g, doc);
  const cause: AttributionCause =
    g.question.type === 'algorithm'
      ? 'formula-misuse'
      : g.question.type === 'case'
        ? 'logic-gap'
        : 'concept-confusion';
  const prereqHint = point?.prerequisites?.length ? '及其前置知识' : '';
  return {
    cause,
    explanation: `本题涉及"${g.question.pointTitle}"${prereqHint}，建议回顾该知识点${prereqHint}后再练。`,
    reviewPointIds,
  };
}

async function recordPracticeEvents(
  courseId: string,
  studentId: string,
  roundId: string,
  graded: GradedQuestion[],
  eventType: 'practice' | 'quiz',
  testId?: string,
): Promise<void> {
  for (const g of graded) {
    try {
      await insertLearningEvent({
        courseId,
        studentId,
        eventType,
        knowledgeNodeId: g.question.pointId,
        score: g.score,
        durationMinutes: 2,
        payload: {
          roundId,
          type: g.question.type,
          difficulty: g.question.difficulty,
          passed: g.passed,
          cause: g.attribution?.cause ?? null,
          ...(testId ? { testId } : {}),
          ...(g.passed ? {} : { gradedQuestion: g }),
        },
      });
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '记录练习事件失败',
      );
    }
  }
}

function groupStats<T extends string>(
  graded: GradedQuestion[],
  keyFn: (g: GradedQuestion) => T,
  order: T[],
): Array<{ key: T; total: number; correct: number; accuracy: number }> {
  return order.map((key) => {
    const items = graded.filter((g) => keyFn(g) === key);
    const total = items.length;
    const correct = items.filter((g) => g.passed).length;
    return { key, total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 };
  });
}

function buildReport(
  roundId: string,
  graded: GradedQuestion[],
  modelString: string,
): PracticeReport {
  const total = graded.length;
  const correct = graded.filter((g) => g.passed).length;
  const unanswered = graded.filter((g) => g.studentAnswer === null).length;
  const wrong = total - correct;
  const score = total > 0 ? Math.round(graded.reduce((s, g) => s + g.score, 0) / total) : 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const byType = groupStats(graded, (g) => g.question.type, VALID_TYPES).map((r) => ({
    type: r.key,
    total: r.total,
    correct: r.correct,
    accuracy: r.accuracy,
  }));
  const byDifficulty = groupStats(graded, (g) => g.question.difficulty, VALID_DIFFICULTIES).map(
    (r) => ({
      difficulty: r.key,
      total: r.total,
      correct: r.correct,
      accuracy: r.accuracy,
    }),
  );

  const weakMap = new Map<string, { title: string; chapter: string; wrongCount: number }>();
  for (const g of graded) {
    if (g.passed) continue;
    const ex = weakMap.get(g.question.pointId) ?? {
      title: g.question.pointTitle,
      chapter: g.question.chapter,
      wrongCount: 0,
    };
    ex.wrongCount += 1;
    weakMap.set(g.question.pointId, ex);
  }
  const weakPoints = Array.from(weakMap.entries())
    .map(([pointId, v]) => ({ pointId, ...v }))
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 6);

  const recommendations = buildRecommendations(graded, weakPoints, accuracy);

  return {
    roundId,
    generatedAt: new Date().toISOString(),
    modelString,
    questionCount: total,
    correctCount: correct,
    wrongCount: wrong,
    unansweredCount: unanswered,
    score,
    accuracy,
    byType,
    byDifficulty,
    weakPoints,
    recommendations,
  };
}

function buildRecommendations(
  graded: GradedQuestion[],
  weakPoints: PracticeReport['weakPoints'],
  accuracy: number,
): string[] {
  const recs: string[] = [];
  if (graded.length === 0) return recs;
  if (accuracy >= 80) {
    recs.push('整体掌握良好，可尝试更高难度或下一章节练习。');
  } else if (accuracy >= 60) {
    recs.push('基本掌握但仍有薄弱点，建议针对错题复盘后再练一轮。');
  } else {
    recs.push('薄弱知识点较多，建议先回到学习资源复习再重做练习。');
  }
  for (const wp of weakPoints.slice(0, 3)) {
    recs.push(
      `重点复习"${wp.title}"（${wp.chapter}），本轮错 ${wp.wrongCount} 次，可用「生成变式题」强化。`,
    );
  }
  const subjectiveWrong = graded.filter(
    (g) => !g.passed && SUBJECTIVE.includes(g.question.type),
  ).length;
  if (subjectiveWrong > 0) {
    recs.push(`${subjectiveWrong} 道主观题失分，建议对照参考答案与评分要点完善表述。`);
  }
  return recs;
}

function buildGradeSystem(): string {
  return `你是具身智能课程的"习题评测智能体"。请对学生的主观题作答进行评阅。

要求：
1. 仅输出一个 JSON 对象 {"results":[...]}，不要 markdown、不要解释。
2. 对每道题给出 0-100 的分数与简短评语。
3. 评分依据参考答案与评分要点，关键概念/步骤正确得分，部分正确给部分分，完全偏离或未涉及给低分。
4. 60 分及以上视为通过。评语指出失分点或可改进之处，使用简体中文。`;
}

function buildGradeUser(subjective: GradedQuestion[]): string {
  const items = subjective
    .map((g, i) =>
      [
        `[题 ${i + 1}] id: ${g.question.id}`,
        `题型: ${g.question.type}`,
        `题干: ${g.question.question}`,
        `学生作答: ${g.studentAnswer}`,
        `参考答案: ${g.question.referenceAnswer ?? ''}`,
        `评分要点: ${g.question.gradingCriteria ?? ''}`,
      ].join('\n'),
    )
    .join('\n\n');
  return `请评阅以下 ${subjective.length} 道主观题作答：

${items}

仅输出 JSON：{"results":[{"id":"题目id","score":85,"feedback":"评语"}]}`;
}

function buildAttributionSystem(): string {
  return `你是具身智能课程的"习题评测智能体"。请分析学生错题的错误成因并给出复盘建议。

错误成因从以下选取其一：
- concept-confusion（概念混淆：对知识点核心概念理解有误）
- formula-misuse（公式误用：公式、定义或计算使用错误）
- logic-gap（逻辑缺失：推理链条断裂或步骤遗漏）
- careless（粗心失误：理解正确但审题/计算失误）
- other（其他）

要求：
1. 仅输出一个 JSON 对象 {"attributions":[...]}，不要 markdown、不要解释。
2. 为每道错题给出 cause、explanation(具体说明错误原因与正确思路)、reviewPointIds(建议复盘的知识点 id 列表)。
3. reviewPointIds 必须从提供的"可选知识点"中选取，应包含本题知识点及其前置/关联点。
4. 语言使用简体中文，表述具体可执行。`;
}

function buildAttributionUser(doc: KnowledgeDoc, wrong: GradedQuestion[]): string {
  const knownIds = getAllPoints(doc).map((p) => p.id);
  const items = wrong
    .map((g, i) => {
      const correctAns =
        g.question.type === 'choice'
          ? (g.question.options?.[g.question.answer as number] ?? '')
          : g.question.type === 'fill'
            ? (g.question.acceptableAnswers ?? []).join(' / ')
            : (g.question.referenceAnswer ?? '');
      return [
        `[错题 ${i + 1}] id: ${g.question.id}`,
        `知识点: ${g.question.pointTitle} (pointId: ${g.question.pointId})`,
        `题型: ${g.question.type}`,
        `题干: ${g.question.question}`,
        `学生作答: ${g.studentAnswer ?? '（未作答）'}`,
        `正确答案: ${correctAns}`,
      ].join('\n');
    })
    .join('\n\n');
  return `可选知识点 id: ${JSON.stringify(knownIds)}

以下为本轮 ${wrong.length} 道错题：

${items}

仅输出 JSON：{"attributions":[{"id":"错题id","cause":"concept-confusion","explanation":"错误原因与正确思路","reviewPointIds":["知识点id"]}]}`;
}

// ---------------------------------------------------------------------------
// 3) 变式题
// ---------------------------------------------------------------------------

export async function generateVariantQuestions(params: {
  seed: GeneratedQuestion;
  count?: number;
}): Promise<GeneratedQuestion[]> {
  const count = Math.min(Math.max(params.count ?? 3, 1), 6);
  const seed = params.seed;
  const doc = await loadKnowledge();
  const point = getPoint(doc, seed.pointId);
  const context = point ? await buildPointContext(doc, point, 0) : null;

  const { model, thinkingConfig } = await resolveModel({ stage: 'teaching-practice' });
  const system = buildVariantSystem(seed);
  const prompt = buildVariantUser(seed, count, context);
  const result = await callLLM(
    { model, system, prompt, maxRetries: 0 },
    'teaching-practice-variant',
    { retries: 1 },
    thinkingConfig,
  );
  const parsed = extractJsonObject<{ questions: unknown[] }>(result.text);
  const roundId = `vr-${nanoid(8)}`;
  const seedPoints = point ? [point] : [];
  const variants = normalizeQuestions(parsed.questions, seedPoints, 'special', roundId, doc).filter(
    (v) => v.type === seed.type,
  );

  return variants.slice(0, count).map((v, i) => ({
    ...v,
    id: `${roundId}-v${i + 1}`,
    pointId: seed.pointId,
    pointTitle: seed.pointTitle,
    chapter: seed.chapter,
    source: seed.source,
    type: seed.type,
    difficulty: seed.difficulty,
  }));
}

function buildVariantSystem(seed: GeneratedQuestion): string {
  return `你是具身智能课程的"习题评测智能体"。请基于一道错题，生成同知识点、同题型、同难度的"变式题"，用于针对性强化训练。

要求：
1. 仅输出一个 JSON 对象 {"questions":[...]}，不要 markdown、不要解释。
2. 每道变式题必须与原题相同的 pointId、相同的 type(${seed.type})、相同的 difficulty(${seed.difficulty})。
3. 题干情境、数据或设问角度需与原题不同，但考查同一知识点。
4. 依据提供的教材原文，不得编造课程外内容。
5. choice 题提供 options 与 answer；fill 题提供 acceptableAnswers；short/case/algorithm 题提供 referenceAnswer 与 gradingCriteria。
6. 每题附 explanation，语言使用简体中文。`;
}

function buildVariantUser(
  seed: GeneratedQuestion,
  count: number,
  context: PointContext | null,
): string {
  const ctxText = context
    ? [
        `知识点: ${context.title}`,
        `章节: ${context.chapter}`,
        context.summary && `摘要: ${context.summary}`,
        context.originalText && `教材原文:\n${context.originalText}`,
      ]
      .filter(Boolean)
      .join('\n')
    : `知识点: ${seed.pointTitle}`;
  const seedDesc = [
    `原题题干: ${seed.question}`,
    `题型: ${seed.type}`,
    `难度: ${seed.difficulty}`,
    `pointId: ${seed.pointId}`,
    seed.type === 'choice' ? `原题选项: ${JSON.stringify(seed.options)}` : '',
    seed.referenceAnswer ? `原题参考答案: ${seed.referenceAnswer}` : '',
  ].filter(Boolean).join('\n');
  return `请基于以下错题生成 ${count} 道同知识点、同题型、同难度的变式题。

${ctxText}

${seedDesc}

仅输出 JSON：{"questions":[{"type":"${seed.type}","difficulty":"${seed.difficulty}","question":"新题干","explanation":"解析","pointId":"${seed.pointId}"}]}（choice/fill/short/case/algorithm 各自补齐对应字段）`;
}

// ---------------------------------------------------------------------------
// 学生薄弱知识点（专项练习选题）
// ---------------------------------------------------------------------------

export async function getStudentWeakPoints(
  courseId: string,
  studentId: string,
): Promise<PracticeWeakPoint[]> {
  const doc = await loadKnowledge();
  const allPoints = getAllPoints(doc);
  let events: TeachingLearningEvent[] = [];
  try {
    events = await getLearningEvents(courseId, studentId);
  } catch {
    events = [];
  }
  const practiceEvents = events.filter(
    (e) => e.eventType === 'practice' || e.eventType === 'quiz',
  );
  const byPoint = new Map<string, { scores: number[]; wrongCount: number }>();
  for (const e of practiceEvents) {
    const stat = byPoint.get(e.knowledgeNodeId) ?? { scores: [], wrongCount: 0 };
    if (typeof e.score === 'number') {
      stat.scores.push(e.score);
      if (e.score < 60) stat.wrongCount += 1;
    }
    byPoint.set(e.knowledgeNodeId, stat);
  }

  const result: PracticeWeakPoint[] = [];
  for (const p of allPoints) {
    const stat = byPoint.get(p.id);
    if (!stat || stat.scores.length === 0) continue;
    const mastery = Math.round(stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length);
    if (mastery < 70 || stat.wrongCount > 0) {
      const chapter = getPointChapter(doc, p.id);
      result.push({
        id: p.id,
        title: p.title,
        chapter: chapter?.title ?? '',
        mastery,
        wrongCount: stat.wrongCount,
      });
    }
  }
  result.sort((a, b) => b.wrongCount - a.wrongCount || a.mastery - b.mastery);

  if (result.length === 0) {
    // 暂无练习数据：按章节顺序返回若干知识点作为待强化候选
    return allPoints.slice(0, 8).map((p) => {
      const chapter = getPointChapter(doc, p.id);
      return {
        id: p.id,
        title: p.title,
        chapter: chapter?.title ?? '',
        mastery: 50,
        wrongCount: 0,
      };
    });
  }
  return result.slice(0, 10);
}


// ---------------------------------------------------------------------------
// 学生错题集（持久化）：从 learning events 中还原历次练习/测试的错题
// ---------------------------------------------------------------------------

export async function getStudentWrongQuestions(
  courseId: string,
  studentId: string,
): Promise<GradedQuestion[]> {
  let events: TeachingLearningEvent[] = [];
  try {
    events = await getLearningEvents(courseId, studentId);
  } catch {
    return [];
  }
  const wrong: GradedQuestion[] = [];
  for (const e of events) {
    if (e.eventType !== 'practice' && e.eventType !== 'quiz') continue;
    if (e.payload?.passed !== false) continue;
    const g = e.payload?.gradedQuestion;
    if (!g || typeof g !== 'object') continue;
    wrong.push(g as GradedQuestion);
  }
  // learning events 按发生时间升序返回，错题集按最近优先展示
  return wrong.reverse().slice(0, 200);
}
