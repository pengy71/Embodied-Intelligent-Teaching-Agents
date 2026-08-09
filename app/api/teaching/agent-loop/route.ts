import { NextRequest } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { getSessionUser } from '@/lib/auth/accounts';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { streamTeachingLoop } from '@/lib/teaching/orchestration/teaching-loop-graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface LoopRequestBody {
  question?: string;
  profile?: { teachingStyle?: string; depth?: string };
  force?: boolean;
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
  if (user.role !== 'student' || !user.studentId) {
    return apiError('INVALID_REQUEST', 403, '仅学生账号可触发教学协同闭环');
  }

  const body = (await req.json().catch(() => ({}))) as LoopRequestBody;
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return apiError('INVALID_REQUEST', 400, 'question is required');
  }

  const profile = {
    teachingStyle:
      typeof body.profile?.teachingStyle === 'string' ? body.profile.teachingStyle : undefined,
    depth: typeof body.profile?.depth === 'string' ? body.profile.depth : undefined,
  };
  const force = body.force !== false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };
      try {
        for await (const event of streamTeachingLoop({
          courseId: DEFAULT_TEACHING_COURSE_ID,
          studentId: user.studentId as string,
          question,
          profile,
          force,
        })) {
          send(event);
        }
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'teaching loop failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}