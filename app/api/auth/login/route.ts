import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/server/api-response';
import { getAccountByUsername } from '@/lib/auth/accounts';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '请输入用户名和密码');
  }

  let account;
  try {
    account = await getAccountByUsername(username);
  } catch {
    return apiError('INTERNAL_ERROR', 500, '无法连接账号数据库');
  }

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return apiError('INVALID_CREDENTIALS', 401, '用户名或密码错误');
  }

  let token: string;
  try {
    token = await createSessionToken({
      uid: account.id,
      role: account.role,
      studentId: account.studentId,
      name: account.displayName,
    });
  } catch {
    return apiError('INTERNAL_ERROR', 500, '会话签发失败：请检查服务端 AUTH_SECRET 配置');
  }

  const res = NextResponse.json({
    success: true,
    user: {
      uid: account.id,
      username: account.username,
      role: account.role,
      name: account.displayName,
      studentId: account.studentId,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
