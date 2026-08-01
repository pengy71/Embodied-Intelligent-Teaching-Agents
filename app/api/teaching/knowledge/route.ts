import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { buildGraphEdges, computeStats } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }
  try {
    const doc = await loadKnowledge();
    return apiSuccess({
      doc,
      graphEdges: buildGraphEdges(doc),
      stats: computeStats(doc),
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '加载知识文档失败');
  }
}
