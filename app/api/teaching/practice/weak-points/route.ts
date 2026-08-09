import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { getStudentWeakPoints } from '@/lib/teaching/practice-agent';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可查看薄弱知识点');
  }
  try {
    const weakPoints = await getStudentWeakPoints(DEFAULT_TEACHING_COURSE_ID, user.studentId);
    return apiSuccess({ weakPoints });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to load weak points');
  }
}