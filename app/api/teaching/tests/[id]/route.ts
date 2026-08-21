import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { deleteStageTest, getStageTest } from '@/lib/teaching/db';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeachingStoreConfigured()) {
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  const { id } = await params;
  try {
    const test = await getStageTest(id);
    if (!test) {
      return apiError('INVALID_REQUEST', 404, '未找到该阶段测试');
    }
    return apiSuccess({ test });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to load stage test',
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeachingStoreConfigured()) {
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'teacher') {
    return apiError('INVALID_REQUEST', 403, '仅教师可删除阶段测试');
  }
  const { id } = await params;
  try {
    await deleteStageTest(id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to delete stage test',
    );
  }
}
