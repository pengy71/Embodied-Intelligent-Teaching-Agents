import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { runTeacherAnalyticsAgent } from '@/lib/teaching/agents';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }
  try {
    const courseId =
      new URL(request.url).searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    const result = await runTeacherAnalyticsAgent({ courseId });

    const metrics = {
      activeStudents: result.summary.activeToday,
      completionRate: result.summary.averageProgress,
      averageMastery: result.summary.averageMastery,
      qaCount: result.activity.qaCount,
      practiceAttempts: result.activity.practiceCount,
      averageScore: result.students.length
        ? Math.round(
            result.students.reduce((sum, student) => sum + student.testScore, 0) /
              result.students.length,
          )
        : 0,
    };

    const chapterStats = result.chapters.map((chapter) => ({
      chapterId: chapter.id,
      chapter: chapter.title,
      completion: chapter.mastery,
      mastery: chapter.mastery,
      pointCount: chapter.points.length,
      weakPointCount: chapter.points.filter((point) => point.mastery < 50).length,
    }));

    const weakPoints = result.chapters
      .flatMap((chapter) => chapter.points)
      .filter((point) => point.mastery < 50)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 8)
      .map((point) => ({
        pointId: point.id,
        title: point.title,
        mastery: point.mastery,
        attempts: 0,
      }));

    return apiSuccess({
      generatedAt: result.generatedAt,
      metrics,
      chapterStats,
      weakPoints,
      teachingSuggestions: result.suggestions.map(
        (suggestion) => `${suggestion.title}：${suggestion.body}`,
      ),
      dataStatus: 'real',
      dataStatusLabel: '实时统计：基于学习事件表聚合',
    });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to build analytics',
    );
  }
}
