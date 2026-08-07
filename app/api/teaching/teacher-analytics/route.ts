import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { runTeacherAnalyticsAgent } from '@/lib/teaching/agents';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    const result = await runTeacherAnalyticsAgent({ courseId });
    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Teacher analytics agent failed',
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { courseId?: string; force?: boolean };
    const result = await runTeacherAnalyticsAgent({
      courseId: body.courseId || DEFAULT_TEACHING_COURSE_ID,
      force: body.force,
    });
    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Teacher analytics agent failed',
    );
  }
}
