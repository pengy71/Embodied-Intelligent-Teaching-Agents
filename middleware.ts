import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE, verifySessionToken } from './lib/auth/session';

function isTeachingPath(pathname: string): boolean {
  return (
    pathname === '/teaching' ||
    pathname.startsWith('/teaching/') ||
    pathname.startsWith('/api/teaching/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth endpoints and the login page are always public
  if (pathname.startsWith('/api/auth/') || pathname === '/login') {
    return NextResponse.next();
  }

  // Protect teaching routes (pages + API) with session auth
  if (isTeachingPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = await verifySessionToken(token);
    if (user) {
      return NextResponse.next();
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, errorCode: 'INVALID_CREDENTIALS', error: '请先登录' },
        { status: 401 },
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
