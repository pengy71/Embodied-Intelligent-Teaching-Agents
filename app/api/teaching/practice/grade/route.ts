import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { upsertStageTestSubmission } from '@/lib/teaching/db';
import { gradeAndAttribution } from '@/lib/teaching/practice-agent';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';
import type { GeneratedQuestion } from '@/lib/teaching/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可提交练习');
  }

  try {
    const body = await req.json().catch(() => ({}));
    const roundId =
      typeof body?.roundId === 'string' && body.roundId.trim() ? body.roundId : `pr-${Date.now()}`;
    const questions = Array.isArray(body?.questions) ? (body.questions as GeneratedQuestion[]) : [];
    const answers =
      body?.answers && typeof body.answers === 'object'
        ? (body.answers as Record<string, number | string | null | undefined>)
        : {};
    const eventType = body?.eventType === 'quiz' ? 'quiz' : 'practice';
    const testId = typeof body?.testId === 'string' && body.testId ? body.testId : undefined;

    if (questions.length === 0) {
      return apiError('INVALID_REQUEST', 400, 'questions is required');
    }

    const round = await gradeAndAttribution({
      courseId: DEFAULT_TEACHING_COURSE_ID,
      studentId: user.studentId,
      roundId,
      questions,
      answers,
      eventType,
      testId,
    });

    if (testId && eventType === 'quiz') {
      try {
        await upsertStageTestSubmission({
          id: `sub-${nanoid(10)}`,
          testId,
          studentId: user.studentId,
          score: round.report.score,
          detail: {
            roundId,
            correctCount: round.report.correctCount,
            questionCount: round.report.questionCount,
          },
        });
      } catch {
        // 提交记录失败不影响评阅结果返回
      }
    }

    return apiSuccess({ round });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to grade practice',
    );
  }
}
