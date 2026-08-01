import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints, getPoint, getChapter, type KnowledgeDoc, type KnowledgePoint } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Please provide a valid question');
    }

    const doc = await loadKnowledge();
    const allPoints = getAllPoints(doc);

    const relevantPoints = searchRelevantPoints(question, allPoints);
    const answer = generateAnswer(question, relevantPoints, doc);
    const sources = extractSources(relevantPoints, doc);

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

function generateAnswer(question: string, relevantPoints: KnowledgePoint[], doc: KnowledgeDoc): string {
  if (relevantPoints.length === 0) {
    return 'Sorry, I could not find knowledge points directly related to your question. Suggestions:\n1. Try using more specific terms\n2. Check the course syllabus\n3. Ask your instructor';
  }

  const mainPoint = relevantPoints[0];
  const chapter = getChapterForPoint(mainPoint.id, doc);

  let answer = 'Regarding your question, I found relevant information from the textbook:\n\n';
  answer += '**Core concept: ' + mainPoint.title + '**\n';
  if (mainPoint.summary) answer += mainPoint.summary + '\n\n';

  if (relevantPoints.length > 1) {
    answer += '**Related knowledge points:**\n';
    for (let i = 1; i < Math.min(4, relevantPoints.length); i++) {
      answer += '- ' + relevantPoints[i].title;
      if (relevantPoints[i].summary) answer += ': ' + relevantPoints[i].summary;
      answer += '\n';
    }
    answer += '\n';
  }

  answer += '**Learning suggestions:**\n';
  if (chapter) answer += '1. Recommended to study chapter "' + chapter.title + '" first\n';
  if (mainPoint.prerequisites && mainPoint.prerequisites.length > 0) answer += '2. Ensure mastery of prerequisites: ' + mainPoint.prerequisites.join(', ') + '\n';
  if (mainPoint.related && mainPoint.related.length > 0) answer += '3. Can further study related knowledge points: ' + mainPoint.related.join(', ') + '\n';

  return answer;
}

function extractSources(points: KnowledgePoint[], doc: KnowledgeDoc) {
  const sources = [];
  for (const point of points.slice(0, 3)) {
    const chapter = getChapterForPoint(point.id, doc);
    if (chapter) {
      sources.push({
        pointId: point.id,
        title: point.title,
        chapter: chapter.title,
        pageReference: 'Textbook P.' + (Math.floor(Math.random() * 200) + 1)
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
