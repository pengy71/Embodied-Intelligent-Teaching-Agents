import { apiSuccess } from '@/lib/server/api-response';
import { getSessionUser } from '@/lib/auth/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return apiSuccess({ user: null });
  }
  return apiSuccess({
    user: {
      uid: user.uid,
      role: user.role,
      name: user.name,
      studentId: user.studentId,
    },
  });
}
