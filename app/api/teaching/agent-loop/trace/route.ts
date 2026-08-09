import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getLatestTeachingAgentRun } from '@/lib/teaching/db';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import type { TeacherLoopSummary } from '@/lib/teaching/orchestration/teaching-loop-graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }
  try {
    const courseId =
      req.nextUrl.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    const summary = await getLatestTeachingAgentRun<TeacherLoopSummary>({
      courseId,
      agentType: 'teacher-summary',
    });
    return apiSuccess({ summary });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to load latest loop summary',
    );
  }
}