import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { generatePracticeQuestions } from '@/lib/teaching/practice-agent';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';
import type { PracticeMode } from '@/lib/teaching/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const VALID_MODES = new Set<PracticeMode>(['adaptive', 'chapter', 'special', 'test']);

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可生成练习');
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode: PracticeMode = VALID_MODES.has(body?.mode) ? body.mode : 'adaptive';
    const count = Math.min(Math.max(Number(body?.count ?? 5), 1), 10);
    const weakPointIds = Array.isArray(body?.weakPointIds)
      ? body.weakPointIds.filter((x: unknown) => typeof x === 'string')
      : [];
    const chapterId = typeof body?.chapterId === 'string' ? body.chapterId : undefined;
    const chapterIds = Array.isArray(body?.chapterIds)
      ? body.chapterIds.filter((x: unknown) => typeof x === 'string')
      : undefined;

    const result = await generatePracticeQuestions({
      courseId: DEFAULT_TEACHING_COURSE_ID,
      studentId: user.studentId,
      mode,
      count,
      weakPointIds,
      chapterId,
      chapterIds,
    });

    return apiSuccess({
      roundId: result.roundId,
      mode,
      questions: result.questions,
      strategy: result.strategy,
      generatedAt: result.generatedAt,
      degraded: result.degraded,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to generate practice');
  }
}