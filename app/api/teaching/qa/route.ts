import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { runQAAgent } from '@/lib/teaching/qa-agent';
import { saveQARecord } from '@/lib/teaching/qa-history';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveStudentId(): Promise<string> {
  try {
    const user = await getSessionUser();
    if (user?.studentId) return user.studentId;
  } catch {
    // No session or auth not configured
  }
  return 'default';
}

export async function POST(request: Request) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  try {
    const body = await request.json();
    const question = body?.question;
    const profile = body?.profile ?? {};

    if (!question || typeof question !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Please provide a valid question');
    }

    const teachingStyle = typeof profile.teachingStyle === 'string' ? profile.teachingStyle : undefined;
    const depth = typeof profile.depth === 'string' ? profile.depth : undefined;

    const result = await runQAAgent({
      question,
      profile: { teachingStyle, depth },
    });

    // Persist Q&A record (best-effort, non-blocking)
    void resolveStudentId()
      .then((studentId) =>
        saveQARecord({
          studentId,
          question,
          answer: result.answer,
          sources: result.sources,
          relatedPoints: result.relatedPoints,
          profile: { teachingStyle, depth },
        }),
      )
      .catch((err) => console.error('[qa] Failed to save history:', err));

    return apiSuccess({
      answer: result.answer,
      sources: result.sources,
      relatedPoints: result.relatedPoints,
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to answer question');
  }
}