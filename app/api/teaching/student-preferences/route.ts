import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  defaultStudentAssistantPreferences,
  normalizeStudentAssistantPreferences,
  type StudentAssistantPreferences,
} from '@/lib/teaching/student-assistant';
import { getStudentAssistantPreferences, saveStudentAssistantPreferences } from '@/lib/teaching/db';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 读取当前登录学生的个性化教学偏好（未保存时返回默认值）。 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'student' || !user.studentId) {
      return apiError('INVALID_CREDENTIALS', 401, '请先登录');
    }
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    const saved = await getStudentAssistantPreferences(courseId, user.studentId);
    return apiSuccess({ preferences: saved ?? defaultStudentAssistantPreferences });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '读取个性化偏好失败',
    );
  }
}

/** 保存当前登录学生的个性化教学偏好。 */
export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'student' || !user.studentId) {
      return apiError('INVALID_CREDENTIALS', 401, '请先登录');
    }
    const body = (await request.json().catch(() => ({}))) as { preferences?: unknown };
    const preferences: StudentAssistantPreferences = normalizeStudentAssistantPreferences(
      body.preferences,
    );
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    await saveStudentAssistantPreferences(courseId, user.studentId, preferences);
    return apiSuccess({ preferences });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : '保存个性化偏好失败',
    );
  }
}
