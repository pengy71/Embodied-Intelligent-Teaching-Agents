import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { createStageTest, getStudentSubmissions, listStageTests } from '@/lib/teaching/db';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { getSessionUser } from '@/lib/auth/accounts';
import type { StageTestConfig, StageTestDifficulty } from '@/lib/teaching/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DIFFICULTIES = new Set<StageTestDifficulty>(['easy', 'medium', 'hard', 'mixed']);

function normalizeConfig(raw: unknown): StageTestConfig {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const chapterIds = Array.isArray(r.chapterIds)
    ? r.chapterIds.filter((x): x is string => typeof x === 'string')
    : [];
  const count = Math.min(Math.max(Number(r.count ?? 8), 1), 15);
  const difficulty = VALID_DIFFICULTIES.has(r.difficulty as StageTestDifficulty)
    ? (r.difficulty as StageTestDifficulty)
    : 'mixed';
  return { chapterIds, count, difficulty };
}

export async function GET() {
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
  try {
    const tests = await listStageTests(DEFAULT_TEACHING_COURSE_ID);
    if (user.role === 'student' && user.studentId) {
      const submissions = await getStudentSubmissions(DEFAULT_TEACHING_COURSE_ID, user.studentId);
      const subMap = new Map(submissions.map((s) => [s.testId, s]));
      const studentTests = tests.map((test) => {
        const sub = subMap.get(test.id);
        return {
          test,
          submitted: Boolean(sub),
          score: sub?.score ?? null,
          submittedAt: sub?.submittedAt ?? null,
        };
      });
      return apiSuccess({ tests: studentTests });
    }
    return apiSuccess({ tests });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to list stage tests',
    );
  }
}

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
  if (user.role !== 'teacher') {
    return apiError('INVALID_REQUEST', 403, '仅教师可发布阶段测试');
  }
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return apiError('INVALID_REQUEST', 400, '测试标题不能为空');
    }
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const dueAt = typeof body?.dueAt === 'string' && body.dueAt ? body.dueAt : null;
    const config = normalizeConfig(body?.config);

    const test = await createStageTest({
      id: `st-${nanoid(10)}`,
      courseId: DEFAULT_TEACHING_COURSE_ID,
      title,
      description,
      config,
      status: 'published',
      createdBy: user.uid,
      dueAt,
    });

    return apiSuccess({ test }, 201);
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to create stage test',
    );
  }
}
