import { apiError, apiSuccess } from '@/lib/server/api-response';
import { isTeachingStoreConfigured } from '@/lib/teaching/store';
import { runQAAgent } from '@/lib/teaching/qa-agent';
import { saveQARecord } from '@/lib/teaching/qa-history';
import { getSessionUser } from '@/lib/auth/accounts';
import { getStudentAssistantPreferences } from '@/lib/teaching/db';
import { preferencesToQAProfile } from '@/lib/teaching/student-assistant';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';

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
    return apiError(
      'INVALID_REQUEST',
      503,
      'Teaching knowledge base not configured: please set DATABASE_URL',
    );
  }

  try {
    const body = await request.json();
    const question = body?.question;
    const profile = body?.profile ?? {};

    if (!question || typeof question !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Please provide a valid question');
    }

    // 优先使用请求中显式指定的风格；未指定时回退到该学生已保存的个性化偏好。
    const studentId = await resolveStudentId();
    let savedProfile: { teachingStyle?: string; depth?: string } = {};
    if (studentId !== 'default') {
      try {
        const saved = await getStudentAssistantPreferences(DEFAULT_TEACHING_COURSE_ID, studentId);
        if (saved) savedProfile = preferencesToQAProfile(saved);
      } catch {
        // 偏好读取失败不影响答疑主流程
      }
    }

    const teachingStyle =
      typeof profile.teachingStyle === 'string' && profile.teachingStyle
        ? profile.teachingStyle
        : savedProfile.teachingStyle;
    const depth =
      typeof profile.depth === 'string' && profile.depth ? profile.depth : savedProfile.depth;

    const result = await runQAAgent({
      question,
      profile: { teachingStyle, depth },
    });

    // Persist Q&A record (best-effort, non-blocking)
    void saveQARecord({
      studentId,
      question,
      answer: result.answer,
      sources: result.sources,
      relatedPoints: result.relatedPoints,
      profile: { teachingStyle, depth },
    }).catch((err) => console.error('[qa] Failed to save history:', err));

    return apiSuccess({
      answer: result.answer,
      sources: result.sources,
      relatedPoints: result.relatedPoints,
    });
  } catch (err) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      err instanceof Error ? err.message : 'Failed to answer question',
    );
  }
}
