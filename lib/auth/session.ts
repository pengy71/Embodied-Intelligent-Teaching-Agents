/**
 * Session token utilities — HMAC-signed, stateless, Edge & Node compatible.
 *
 * Token format: `{payloadB64url}.{sigHex}`
 *   payload  — base64url-encoded JSON: { uid, role, studentId, name, exp }
 *   sig      — HMAC-SHA256(payloadB64url, AUTH_SECRET) as hex
 *
 * The same verify logic runs in the Edge middleware and in Node API routes,
 * so we only use the Web Crypto API (no Node-only APIs).
 */

export type SessionRole = 'teacher' | 'student';

export interface SessionUser {
  uid: string;
  role: SessionRole;
  /** Linked teaching_students.id; null for teachers. */
  studentId: string | null;
  name: string;
  exp: number; // unix seconds
}

export const SESSION_COOKIE = 'teaching_session';
/** 7 days in seconds. */
const SESSION_TTL = 7 * 24 * 60 * 60;

/**
 * Fixed, insecure secret used only when AUTH_SECRET is unset in development,
 * so a fresh clone can `pnpm dev` and log in without extra config.
 * MUST NOT be used in production (NODE_ENV === 'production' still throws).
 * Stable across Edge & Node runtimes so signed tokens verify correctly.
 */
const DEV_FALLBACK_SECRET =
  'dev-only-insecure-secret-please-set-AUTH_SECRET-in-.env.local';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return DEV_FALLBACK_SECRET;
  }
  throw new Error('AUTH_SECRET is not set. Add it to your .env.local (see .env.example).');
}

/* ----------------------------- base64url helpers ----------------------------- */

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): string {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* --------------------------------- HMAC core --------------------------------- */

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(sig);
}

/* ------------------------------ public session API ------------------------------ */

/** Build a signed session token for the given user. */
export async function createSessionToken(user: Omit<SessionUser, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload: SessionUser = { ...user, exp };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = await hmacSign(payloadB64, getAuthSecret());
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a session token and return the decoded user, or null if invalid/expired.
 * Never throws.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;

  const payloadB64 = token.substring(0, dot);
  const sig = token.substring(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = await hmacSign(payloadB64, getAuthSecret());
  } catch {
    return null;
  }
  if (!timingSafeEqual(sig, expectedSig)) return null;

  try {
    const user = JSON.parse(b64urlDecode(payloadB64)) as SessionUser;
    if (typeof user.exp !== 'number' || user.exp < Math.floor(Date.now() / 1000)) return null;
    return user;
  } catch {
    return null;
  }
}

/** Cookie attributes for the session cookie. */
export function sessionCookieOptions(maxAge = SESSION_TTL) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
