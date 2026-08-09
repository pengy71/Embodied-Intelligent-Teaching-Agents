import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  getProgress,
  upsertProgress,
  isTeachingStoreConfigured,
  type StudentProgressStatus,
} from '@/lib/teaching/store';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  const studentId = user.role === 'student' ? user.studentId : req.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required query parameter: studentId');
  }
  try {
    const progress = await getProgress(studentId);
    return apiSuccess({ progress });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to load progress');
  }
}

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可更新学习进度');
  }
  try {
    const body = await req.json();
    const { pointId, status } = body ?? {};
    if (!pointId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: pointId');
    }
    const normalized: StudentProgressStatus = status === 'learned' ? 'learned' : 'learning';
    await upsertProgress(user.studentId, pointId, normalized);
    return apiSuccess({ pointId, status: normalized });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to update progress');
  }
}