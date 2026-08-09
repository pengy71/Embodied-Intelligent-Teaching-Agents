import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { reindexKnowledgePoints } from '@/lib/teaching/reindex';
import { isEmbeddingConfigured } from '@/lib/teaching/embedding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 手动触发知识点向量索引重建。资源原文块在资源上传时已自动索引。 */
export async function POST() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  if (!isEmbeddingConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Embedding not configured: please set GLM_API_KEY or EMBEDDING_API_KEY');
  }

  try {
    const result = await reindexKnowledgePoints();
    return apiSuccess({ indexed: result.indexed });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Reindex failed');
  }
}