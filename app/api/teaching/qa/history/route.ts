import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { listQAHistory, countQAHistory } from '@/lib/teaching/qa-history';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveStudentId(): Promise<string> {
  try {
    const user = await getSessionUser();
    if (user?.studentId) return user.studentId;
  } catch {
    // No session or auth not configured
  }
  return 'default';
}

export async function GET(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured');
  }

  try {
    const studentId = await resolveStudentId();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 200);
    const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);

    const [records, total] = await Promise.all([
      listQAHistory(studentId, limit, offset),
      countQAHistory(studentId),
    ]);

    return apiSuccess({ records, total, hasMore: offset + records.length < total });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to fetch Q&A history',
    );
  }
}
