import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { runStudentGuidanceAgent } from '@/lib/teaching/agents';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError('INVALID_CREDENTIALS', 401, '请先登录');
    }
    const search = req.nextUrl.searchParams;
    const courseId = search.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    // Students always use their own id; teachers may specify one to preview.
    const studentId = user.role === 'student' ? user.studentId : search.get('studentId');
    if (!studentId) {
      return apiError('INVALID_REQUEST', 400, 'studentId is required');
    }
    const result = await runStudentGuidanceAgent({ courseId, studentId });
    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Student guidance agent failed',
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError('INVALID_CREDENTIALS', 401, '请先登录');
    }
    const body = (await req.json().catch(() => ({}))) as {
      courseId?: string;
      studentId?: string;
      force?: boolean;
    };
    const studentId = user.role === 'student' ? user.studentId : body.studentId;
    if (!studentId) {
      return apiError('INVALID_REQUEST', 400, 'studentId is required');
    }
    const result = await runStudentGuidanceAgent({
      courseId: body.courseId || DEFAULT_TEACHING_COURSE_ID,
      studentId,
      force: body.force,
    });
    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Student guidance agent failed',
    );
  }
}