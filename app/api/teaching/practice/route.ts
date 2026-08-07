import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints, getPointChapter, type KnowledgeDoc, type KnowledgePoint } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PracticeMode = 'adaptive' | 'chapter' | 'special' | 'test';

export async function POST(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = normalizeMode(body?.mode);
    const count = Math.min(Math.max(Number(body?.count ?? 5), 1), 10);
    const weakPointIds = Array.isArray(body?.weakPointIds) ? body.weakPointIds.filter((x: unknown) => typeof x === 'string') : [];
    const doc = await loadKnowledge();
    const allPoints = getAllPoints(doc);
    const candidates = chooseCandidates(allPoints, mode, weakPointIds);
    const questions = candidates.slice(0, count).map((point, index) => buildQuestion(point, index, allPoints, doc, mode));

    return apiSuccess({
      mode,
      questions,
      strategy: mode === 'adaptive' ? '优先覆盖薄弱知识点，并补充其前置知识' : mode === 'special' ? '围绕高频易错点生成专项练习' : '按课程知识图谱顺序生成练习',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to generate practice');
  }
}

function normalizeMode(mode: unknown): PracticeMode {
  return mode === 'chapter' || mode === 'special' || mode === 'test' ? mode : 'adaptive';
}

function chooseCandidates(points: KnowledgePoint[], mode: PracticeMode, weakPointIds: string[]) {
  const weak = new Set(weakPointIds);
  const weakPoints = points.filter((p) => weak.has(p.id));
  const mistakes = points.filter((p) => (p.mistakes?.length ?? 0) > 0);
  const ordered = mode === 'adaptive' ? [...weakPoints, ...points] : mode === 'special' ? [...mistakes, ...points] : points;
  return [...new Map(ordered.map((p) => [p.id, p])).values()];
}

function buildQuestion(point: KnowledgePoint, index: number, allPoints: KnowledgePoint[], doc: KnowledgeDoc, mode: PracticeMode) {
  const chapter = getPointChapter(doc, point.id);
  const relatedTitles = (point.related ?? []).map((id) => allPoints.find((p) => p.id === id)?.title).filter(Boolean) as string[];
  const distractors = allPoints.filter((p) => p.id !== point.id && !relatedTitles.includes(p.title)).slice(index + 1, index + 4).map((p) => p.title);
  const options = [point.title, ...distractors].slice(0, 4);
  while (options.length < 4) options.push(`其他课程知识点 ${options.length + 1}`);
  return {
    id: `practice-${mode}-${point.id}`,
    type: 'single',
    question: `关于“${point.title}”，以下哪一项最符合课程知识库中的核心表述？`,
    options,
    answer: 0,
    explanation: point.summary || `该题考查知识点“${point.title}”及其在具身智能课程中的基本含义。`,
    pointId: point.id,
    pointTitle: point.title,
    chapter: chapter?.title ?? '课程知识体系',
    source: `课程知识库 · ${chapter?.title ?? '知识点原文'}`,
    difficulty: mode === 'special' ? 'hard' : mode === 'test' ? 'medium' : 'adaptive',
  };
}
