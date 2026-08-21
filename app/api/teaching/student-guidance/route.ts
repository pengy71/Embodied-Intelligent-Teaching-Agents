import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getStoredStudentGuidance, runStudentGuidanceAgent } from '@/lib/teaching/agents';
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
    // 只读取数据库中已存储的导学结果，不会调用大模型
    const result = await getStoredStudentGuidance({ courseId, studentId });
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
    };
    const studentId = user.role === 'student' ? user.studentId : body.studentId;
    if (!studentId) {
      return apiError('INVALID_REQUEST', 400, 'studentId is required');
    }
    // 手动刷新：调用大模型重新生成并写入数据库
    const result = await runStudentGuidanceAgent({
      courseId: body.courseId || DEFAULT_TEACHING_COURSE_ID,
      studentId,
      force: true,
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
