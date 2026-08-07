import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';
import { insertLearningEvent } from '@/lib/teaching/db';
import type { TeachingLearningEvent } from '@/lib/teaching/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENT_TYPES = new Set([
  'study',
  'practice',
  'qa',
  'quiz',
  'review',
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      studentId?: string;
      eventType?: string;
      knowledgeNodeId?: string;
      score?: number | null;
      durationMinutes?: number;
      payload?: Record<string, unknown>;
    };

    const studentId = (body.studentId ?? '').trim();
    const eventType = (body.eventType ?? '').trim();
    const knowledgeNodeId = (body.knowledgeNodeId ?? '').trim();

    if (!studentId) {
      return apiError('INVALID_REQUEST', 400, 'studentId is required');
    }
    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return apiError('INVALID_REQUEST', 400, `eventType must be one of: ${Array.from(ALLOWED_EVENT_TYPES).join(', ')}`);
    }
    if (!knowledgeNodeId) {
      return apiError('INVALID_REQUEST', 400, 'knowledgeNodeId is required');
    }

    const score =
      body.score === null || body.score === undefined || Number.isNaN(Number(body.score))
        ? null
        : Number(body.score);
    const durationMinutes = Math.max(0, Math.round(Number(body.durationMinutes ?? 0) || 0));

    const event = await insertLearningEvent({
      courseId: DEFAULT_TEACHING_COURSE_ID,
      studentId,
      eventType: eventType as TeachingLearningEvent['eventType'],
      knowledgeNodeId,
      score,
      durationMinutes,
      payload: body.payload ?? {},
    });

    return apiSuccess({ event }, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to record learning event');
  }
}