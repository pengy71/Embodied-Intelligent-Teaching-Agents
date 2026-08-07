import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints, type KnowledgeDoc, type KnowledgePoint } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  try {
    const body = await request.json();
    const question = body?.question;
    const profile = body?.profile ?? {};

    if (!question || typeof question !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Please provide a valid question');
    }

    const doc = await loadKnowledge();
    const allPoints = getAllPoints(doc);

    const relevantPoints = searchRelevantPoints(question, allPoints);
    const answer = generateAnswer(question, relevantPoints, doc, profile);
    const sources = extractSources(relevantPoints, doc, allPoints);

    return apiSuccess({
      answer,
      sources,
      relatedPoints: relevantPoints.slice(0, 5).map(p => ({
        id: p.id,
        title: p.title,
        summary: p.summary,
        chapter: getChapterForPoint(p.id, doc)?.title
      }))
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to answer question');
  }
}

function searchRelevantPoints(question: string, allPoints: KnowledgePoint[]): KnowledgePoint[] {
  const questionLower = question.toLowerCase();
  const keywords = extractKeywords(questionLower);

  const scoredPoints = allPoints.map(point => {
    let score = 0;
    const titleLower = point.title.toLowerCase();
    const summaryLower = point.summary?.toLowerCase() || '';

    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) score += 3;
      if (summaryLower.includes(keyword)) score += 1;
    }

    return { point, score };
  });

  return scoredPoints
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.point);
}

function extractKeywords(text: string): string[] {
  const commonKeywords = [
    'RRT', 'PRM', 'PPO', 'SAC', 'DDPM', 'diffusion', 'world model',
    'reinforcement learning', 'imitation learning', 'motion planning', 'force control',
    'Kalman filter', 'point cloud', 'ICP', 'YOLO', 'semantic segmentation',
    'Lie group', 'Lie algebra', 'SO(3)', 'SE(3)', 'Jacobian',
    'inverse kinematics', 'forward kinematics', 'dynamics', 'Lagrange',
    'trajectory optimization', 'grasp planning', 'tactile sensing',
    'Sim-to-Real', 'domain randomization', 'behavioral cloning',
    'Flow Matching', 'Score model', 'normalizing flow',
    'HTN', 'hierarchical task network', 'task decomposition'
  ];

  const foundKeywords: string[] = [];
  for (const keyword of commonKeywords) {
    if (text.includes(keyword.toLowerCase())) foundKeywords.push(keyword);
  }

  if (foundKeywords.length === 0) {
    const words = text.split(/[\s,]+/).filter(w => w.length > 1);
    foundKeywords.push(...words.slice(0, 5));
  }

  return foundKeywords;
}

function generateAnswer(
  question: string,
  relevantPoints: KnowledgePoint[],
  doc: KnowledgeDoc,
  profile: { teachingStyle?: string; depth?: string } = {},
): string {
  if (relevantPoints.length === 0) {
    return 'Sorry, I could not find knowledge points directly related to your question. Suggestions:\n1. Try using more specific terms\n2. Check the course syllabus\n3. Ask your instructor';
  }

  const mainPoint = relevantPoints[0];
  const chapter = getChapterForPoint(mainPoint.id, doc);

  const style = profile.teachingStyle ?? '引导启发型';
  const deep = profile.depth ?? '标准';
  let answer = `我按“${style}、${deep}深度”整理了课程知识库中的相关内容：\n\n`;
  answer += '**核心知识点：' + mainPoint.title + '**\n';
  if (mainPoint.summary) answer += mainPoint.summary + '\n\n';

  if (style.includes('通俗')) {
    answer += '先用一句话理解：把这个知识点放回“感知—决策—动作”的具身智能闭环中，它解决的是系统如何从观测得到可执行行为。\n\n';
  } else if (style.includes('严谨')) {
    answer += '建议先明确输入、输出、假设和评价指标，再结合教材中的定义与推导进行复习。\n\n';
  } else if (style.includes('实践')) {
    answer += '实践建议：先在一个最小实验中固定数据和评价指标，再逐步替换模型或控制策略。\n\n';
  }

  if (relevantPoints.length > 1) {
    answer += '**相关知识点：**\n';
    for (let i = 1; i < Math.min(4, relevantPoints.length); i++) {
      answer += '- ' + relevantPoints[i].title;
      if (relevantPoints[i].summary) answer += ': ' + relevantPoints[i].summary;
      answer += '\n';
    }
    answer += '\n';
  }

  answer += '**学习建议：**\n';
  if (chapter) answer += '1. 建议先复习章节“' + chapter.title + '”\n';
  if (mainPoint.prerequisites && mainPoint.prerequisites.length > 0) answer += '2. 先确认前置知识：' + mainPoint.prerequisites.join('、') + '\n';
  if (mainPoint.related && mainPoint.related.length > 0) answer += '3. 下一步可学习：' + mainPoint.related.join('、') + '\n';

  return answer;
}

function extractSources(points: KnowledgePoint[], doc: KnowledgeDoc, allPoints: KnowledgePoint[]) {
  const sources = [];
  for (const point of points.slice(0, 3)) {
    const chapter = getChapterForPoint(point.id, doc);
    if (chapter) {
      sources.push({
        pointId: point.id,
        title: point.title,
        chapter: chapter.title,
        pageReference: `课程知识库·第${chapter.number}章·知识点 ${allPoints.indexOf(point) + 1}`,
        sourceType: 'course-knowledge-base',
        confidence: 0.86,
      });
    }
  }
  return sources;
}

function getChapterForPoint(pointId: string, doc: KnowledgeDoc) {
  for (const chapter of doc.chapters) {
    for (const section of chapter.sections) {
      if (section.points.some(p => p.id === pointId)) return chapter;
    }
  }
  return null;
}
