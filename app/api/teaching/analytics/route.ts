import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getAllPoints } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  try {
    const doc = await loadKnowledge();
    const points = getAllPoints(doc);
    const chapterStats = doc.chapters.map((chapter, index) => {
      const chapterPoints = chapter.sections.flatMap((section) => section.points);
      const mastery = Math.max(28, 78 - index * 7);
      return {
        chapterId: chapter.id,
        chapter: chapter.title,
        completion: Math.max(35, 92 - index * 6),
        mastery,
        pointCount: chapterPoints.length,
        weakPointCount: chapterPoints.filter((_, pointIndex) => (pointIndex + index) % 3 === 0).length,
      };
    });
    const weakPoints = points
      .map((point, index) => ({ pointId: point.id, title: point.title, mastery: Math.max(24, 68 - (index % 8) * 6), attempts: 3 + (index % 5) }))
      .filter((point) => point.mastery < 50)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 8);

    return apiSuccess({
      generatedAt: new Date().toISOString(),
      metrics: {
        activeStudents: 32,
        completionRate: 68,
        averageMastery: Math.round(chapterStats.reduce((sum, item) => sum + item.mastery, 0) / Math.max(chapterStats.length, 1)),
        qaCount: 146,
        practiceAttempts: 218,
        averageScore: 76,
      },
      chapterStats,
      weakPoints,
      teachingSuggestions: weakPoints.slice(0, 3).map((point) => `课堂补充 ${point.title}，建议安排一次概念讲解与专项练习`),
      dataStatus: 'demo',
      dataStatusLabel: '当前为演示数据；接入学习事件表后自动替换为实时统计',
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to build analytics');
  }
}
