import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getStoredTeacherAnalytics, runTeacherAnalyticsAgent } from '@/lib/teaching/agents';
import { DEFAULT_TEACHING_COURSE_ID } from '@/lib/teaching/seed';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId') || DEFAULT_TEACHING_COURSE_ID;
    // 只读取数据库中已存储的学情分析结果，不会调用大模型
    const result = await getStoredTeacherAnalytics({ courseId });
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
    const body = (await req.json().catch(() => ({}))) as { courseId?: string };
    // 手动刷新：调用大模型重新生成并写入数据库
    const result = await runTeacherAnalyticsAgent({
      courseId: body.courseId || DEFAULT_TEACHING_COURSE_ID,
      force: true,
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
