import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints, getPoint, type KnowledgeDoc, type KnowledgePoint } from '@/lib/teaching/knowledge-doc';

interface StudentProgress {
  masteredPoints: string[];
  currentChapter: string;
  weakPoints: string[];
  learningHistory: Array<{ pointId: string; timestamp: number; mastery: number }>;
}

interface Recommendation {
  type: string;
  pointId: string;
  title: string;
  reason: string;
  priority: string;
}

interface TodaySuggestion {
  type: string;
  pointId: string;
  title: string;
  estimatedTime: number;
  reason: string;
}


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  try {
    const doc = await loadKnowledge();
    const style = new URL(request.url).searchParams.get('style') ?? '引导启发型';
    const depth = new URL(request.url).searchParams.get('depth') ?? '标准';
    const allPoints = getAllPoints(doc);

    const studentProgress = {
      masteredPoints: ['ch01-1-1', 'ch01-1-2', 'ch01-2-1', 'ch01-2-2'],
      currentChapter: 'ch02',
      weakPoints: ['ch01-1-3', 'ch01-2-3'],
      learningHistory: [
        { pointId: 'ch01-1-1', timestamp: Date.now() - 86400000 * 3, mastery: 90 },
        { pointId: 'ch01-1-2', timestamp: Date.now() - 86400000 * 2, mastery: 85 },
        { pointId: 'ch01-2-1', timestamp: Date.now() - 86400000, mastery: 75 },
      ]
    };

    const recommendations = generateRecommendations(doc, studentProgress);
    const learningPath = generateLearningPath(doc, studentProgress);
    const todaySuggestions = generateTodaySuggestions(doc, studentProgress);

    return apiSuccess({
      recommendations,
      learningPath,
      todaySuggestions,
      studentProgress,
      knowledgeStats: {
        totalPoints: allPoints.length,
        masteredPoints: studentProgress.masteredPoints.length,
        weakPoints: studentProgress.weakPoints.length,
        currentChapter: studentProgress.currentChapter,
      },
      profile: { teachingStyle: style, depth },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to generate learning suggestions');
  }
}

function generateRecommendations(doc: KnowledgeDoc, studentProgress: StudentProgress) {
  const allPoints = getAllPoints(doc);
  const masteredSet = new Set<string>(studentProgress.masteredPoints);
  const weakSet = new Set<string>(studentProgress.weakPoints);

  const prerequisiteRecommendations: Recommendation[] = [];
  for (const point of allPoints) {
    if (masteredSet.has(point.id)) continue;
    const prerequisites = point.prerequisites || [];
    const missingPrereqs = prerequisites.filter((p: string) => !masteredSet.has(p));
    if (missingPrereqs.length === 0) {
      prerequisiteRecommendations.push({
        type: 'prerequisite',
        pointId: point.id,
        title: point.title,
        reason: 'Prerequisites mastered, ready to learn',
        priority: 'high'
      });
    }
  }

  const weakPointRecommendations: Recommendation[] = [];
  for (const pointId of weakSet) {
    const point = getPoint(doc, pointId);
    if (point) {
      weakPointRecommendations.push({
        type: 'review',
        pointId: point.id,
        title: point.title,
        reason: 'Needs strengthening',
        priority: 'medium'
      });
    }
  }

  const relatedRecommendations: Recommendation[] = [];
  for (const pointId of studentProgress.masteredPoints.slice(0, 3)) {
    const point = getPoint(doc, pointId);
    if (point && point.related) {
      for (const relatedId of point.related) {
        if (!masteredSet.has(relatedId)) {
          const relatedPoint = getPoint(doc, relatedId);
          if (relatedPoint) {
            relatedRecommendations.push({
              type: 'related',
              pointId: relatedId,
              title: relatedPoint.title,
              reason: 'Related to mastered "' + point.title + '"',
              priority: 'low'
            });
          }
        }
      }
    }
  }

  return [
    ...prerequisiteRecommendations.slice(0, 3),
    ...weakPointRecommendations.slice(0, 2),
    ...relatedRecommendations.slice(0, 2)
  ];
}

function generateLearningPath(doc: KnowledgeDoc, studentProgress: StudentProgress) {
  const masteredSet = new Set<string>(studentProgress.masteredPoints);

  const path = [];
  for (const chapter of doc.chapters) {
    const chapterPoints = chapter.sections.flatMap(s => s.points);
    const masteredInChapter = chapterPoints.filter(p => masteredSet.has(p.id)).length;
    const progress = chapterPoints.length > 0 ? Math.round((masteredInChapter / chapterPoints.length) * 100) : 0;

    path.push({
      chapterId: chapter.id,
      title: chapter.title,
      progress,
      totalPoints: chapterPoints.length,
      masteredPoints: masteredInChapter,
      isCurrent: chapter.id === studentProgress.currentChapter,
      points: chapterPoints.map(p => ({
        id: p.id,
        title: p.title,
        mastered: masteredSet.has(p.id),
        isWeak: studentProgress.weakPoints.includes(p.id)
      }))
    });
  }

  return path;
}

function generateTodaySuggestions(doc: KnowledgeDoc, studentProgress: StudentProgress) {
  const allPoints = getAllPoints(doc);
  const masteredSet = new Set<string>(studentProgress.masteredPoints);
  const weakSet = new Set<string>(studentProgress.weakPoints);

  const suggestions: TodaySuggestion[] = [];

  for (const pointId of weakSet) {
    const point = getPoint(doc, pointId);
    if (point) {
      suggestions.push({
        type: 'review',
        pointId: point.id,
        title: point.title,
        estimatedTime: 15,
        reason: 'Weak point needs consolidation'
      });
    }
  }

  for (const point of allPoints) {
    if (masteredSet.has(point.id)) continue;
    const prerequisites = point.prerequisites || [];
    const missingPrereqs = prerequisites.filter((p: string) => !masteredSet.has(p));
    if (missingPrereqs.length === 0) {
      suggestions.push({
        type: 'new',
        pointId: point.id,
        title: point.title,
        estimatedTime: 20,
        reason: 'Prerequisites mastered, ready to learn'
      });
      if (suggestions.length >= 3) break;
    }
  }

  return suggestions;
}
