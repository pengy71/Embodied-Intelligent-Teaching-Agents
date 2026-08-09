import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { generateVariantQuestions } from '@/lib/teaching/practice-agent';
import { getSessionUser } from '@/lib/auth/accounts';
import type { GeneratedQuestion } from '@/lib/teaching/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }
  const user = await getSessionUser();
  if (!user) {
    return apiError('INVALID_CREDENTIALS', 401, '请先登录');
  }
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可生成变式题');
  }

  try {
    const body = await req.json().catch(() => ({}));
    const seed = body?.seed;
    if (!seed || typeof seed !== 'object' || typeof seed.pointId !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'seedQuestion is required');
    }
    const count = Math.min(Math.max(Number(body?.count ?? 3), 1), 6);

    const questions = await generateVariantQuestions({
      seed: seed as GeneratedQuestion,
      count,
    });

    return apiSuccess({ questions });
  } catch (err) {
    return apiError('GENERATION_FAILED', 503, err instanceof Error ? err.message : 'Failed to generate variant questions');
  }
}