import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { runStudentGuidanceAgent } from '@/lib/teaching/agents';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const courseId = search.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    const studentId = search.get('studentId') || '2024001';
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
    const body = (await req.json().catch(() => ({}))) as {
      courseId?: string;
      studentId?: string;
      force?: boolean;
    };
    const result = await runStudentGuidanceAgent({
      courseId: body.courseId || DEFAULT_TEACHING_COURSE_ID,
      studentId: body.studentId || '2024001',
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
