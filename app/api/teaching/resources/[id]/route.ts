import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getResource, isTeachingStoreConfigured } from '@/lib/teaching/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }
  const { id } = await params;
  try {
    const resource = await getResource(id);
    if (!resource) return apiError('INVALID_REQUEST', 404, '资源不存在');
    return apiSuccess({ resource });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '获取资源失败');
  }
}
