import { NextResponse } from 'next/server';

import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
