import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';
import type { Scene, Stage } from '@/lib/types/stage';
import { ENABLE_PUBLIC_RLS_SQL } from '@/lib/db-rls';
import { Pool } from 'pg';

export const CLASSROOMS_DIR = path.join(process.cwd(), 'data', 'classrooms');
export const CLASSROOM_JOBS_DIR = path.join(process.cwd(), 'data', 'classroom-jobs');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function ensureClassroomsDir() {
  await ensureDir(CLASSROOMS_DIR);
}

export async function ensureClassroomJobsDir() {
  await ensureDir(CLASSROOM_JOBS_DIR);
}

export async function writeJsonFileAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, 'utf-8');
  await fs.rename(tempFilePath, filePath);
}

let classroomPool: Pool | undefined;

export function getClassroomPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for classroom storage');
  }
  if (!classroomPool) {
    classroomPool = new Pool({ connectionString, max: 10 });
  }
  return classroomPool;
}

async function ensureClassroomsSchema(): Promise<void> {
  await getClassroomPool().query(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- 建表完成后锁定 public schema（拒绝 Supabase 公开 API，详见 lib/db-rls.ts）
    ${ENABLE_PUBLIC_RLS_SQL}
  `);
}

export function buildRequestOrigin(req: NextRequest): string {
  return req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
    : req.nextUrl.origin;
}

export interface PersistedClassroomData {
  id: string;
  stage: Stage;
  scenes: Scene[];
  createdAt: string;
}

export function isValidClassroomId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function readClassroom(id: string): Promise<PersistedClassroomData | null> {
  await ensureClassroomsSchema();
  const { rows } = await getClassroomPool().query('SELECT data FROM classrooms WHERE id = $1', [
    id,
  ]);
  if (!rows.length) return null;
  return rows[0].data as PersistedClassroomData;
}

export async function persistClassroom(
  data: {
    id: string;
    stage: Stage;
    scenes: Scene[];
  },
  baseUrl: string,
): Promise<PersistedClassroomData & { url: string }> {
  const classroomData: PersistedClassroomData = {
    id: data.id,
    stage: data.stage,
    scenes: data.scenes,
    createdAt: new Date().toISOString(),
  };

  await ensureClassroomsSchema();
  await getClassroomPool().query(
    `INSERT INTO classrooms (id, data, created_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = now()`,
    [data.id, JSON.stringify(classroomData)],
  );

  return {
    ...classroomData,
    url: `${baseUrl}/classroom/${data.id}`,
  };
}
