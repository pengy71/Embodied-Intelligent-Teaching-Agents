import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  getProgress,
  upsertProgress,
  isTeachingStoreConfigured,
  type StudentProgressStatus,
} from '@/lib/teaching/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const studentId = req.nextUrl.searchParams.get('studentId');
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
  try {
    const body = await req.json();
    const { studentId, pointId, status } = body ?? {};
    if (!studentId || !pointId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required fields: studentId, pointId');
    }
    const normalized: StudentProgressStatus = status === 'learned' ? 'learned' : 'learning';
    await upsertProgress(studentId, pointId, normalized);
    return apiSuccess({ pointId, status: normalized });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to update progress');
  }
}
