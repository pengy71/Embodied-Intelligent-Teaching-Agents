import { cookies } from 'next/headers';

import { ensureTeachingDatabase, getTeachingPool } from '@/lib/teaching/db';
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from './session';

export interface TeachingAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: 'teacher' | 'student';
  displayName: string;
  /** Linked teaching_students.id; null for teachers. */
  studentId: string | null;
}

/** Look up an account by username (used by the login route). */
export async function getAccountByUsername(username: string): Promise<TeachingAccount | null> {
  await ensureTeachingDatabase();
  const pool = getTeachingPool();
  const result = await pool.query<{
    id: string;
    username: string;
    password_hash: string;
    role: string;
    display_name: string;
    student_id: string | null;
  }>(
    `SELECT id, username, password_hash, role, display_name, student_id
     FROM teaching_accounts
     WHERE username = $1`,
    [username],
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as TeachingAccount['role'],
    displayName: row.display_name,
    studentId: row.student_id ?? null,
  };
}

/**
 * Read & verify the session cookie on the server (Node runtime only).
 * Returns null when not authenticated or when the session has expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}