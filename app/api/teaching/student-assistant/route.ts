import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints, getPoint, type KnowledgeDoc } from '@/lib/teaching/knowledge-doc';
import { getLearningEvents } from '@/lib/teaching/db';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';
import type { TeachingLearningEvent } from '@/lib/teaching/types';

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

const MASTERED_THRESHOLD = 70;
const WEAK_POINT_THRESHOLD = 50;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError('INVALID_CREDENTIALS', 401, '请先登录');
    }
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    // Students always use their own id; teachers may specify one to preview.
    const studentId = user.role === 'student' ? user.studentId : url.searchParams.get('studentId');
    if (!studentId) {
      return apiError('INVALID_REQUEST', 400, 'studentId is required');
    }

    const doc = await loadKnowledge();
    const style = url.searchParams.get('style') ?? '引导启发型';
    const depth = url.searchParams.get('depth') ?? '标准';
    const allPoints = getAllPoints(doc);
    const events = await getLearningEvents(courseId, studentId);

    // Real per-point mastery aggregated from the student's learning events.
    const masteryByPoint = new Map<string, number>();
    for (const point of allPoints) {
      masteryByPoint.set(point.id, computePointMastery(point.id, events));
    }

    const masteredPoints = allPoints
      .filter((point) => (masteryByPoint.get(point.id) ?? 0) >= MASTERED_THRESHOLD)
      .map((point) => point.id);
    const weakPoints = allPoints
      .filter((point) => (masteryByPoint.get(point.id) ?? 0) < WEAK_POINT_THRESHOLD)
      .sort((a, b) => (masteryByPoint.get(a.id) ?? 0) - (masteryByPoint.get(b.id) ?? 0))
      .map((point) => point.id)
      .slice(0, 8);

    const currentChapter =
      doc.chapters.find((chapter) =>
        chapter.sections.some((section) => section.points.some((point) => !masteredPoints.includes(point.id))),
      )?.id ?? doc.chapters[0]?.id ?? '';

    const learningHistory = events
      .filter((event) => getPoint(doc, event.knowledgeNodeId))
      .map((event) => ({
        pointId: event.knowledgeNodeId,
        timestamp: new Date(event.occurredAt).getTime(),
        mastery:
          typeof event.score === 'number'
            ? clampPercent(event.score)
            : masteryByPoint.get(event.knowledgeNodeId) ?? 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const studentProgress: StudentProgress = {
      masteredPoints,
      currentChapter,
      weakPoints,
      learningHistory,
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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Compute real mastery (0-100) for a knowledge point from the student's learning events. */
function computePointMastery(pointId: string, events: TeachingLearningEvent[], baseline = 50): number {
  const scores = events
    .filter((event) => event.knowledgeNodeId === pointId)
    .map((event) => event.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  if (scores.length === 0) return baseline;
  return clampPercent(scores.reduce((sum, score) => sum + score, 0) / scores.length);
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