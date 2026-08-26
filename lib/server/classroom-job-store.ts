import type { PoolClient } from 'pg';
import type {
  ClassroomGenerationProgress,
  ClassroomGenerationStep,
  GenerateClassroomInput,
  GenerateClassroomResult,
} from '@/lib/server/classroom-generation';
import { getClassroomPool } from '@/lib/server/classroom-storage';
import { ENABLE_PUBLIC_RLS_SQL } from '@/lib/db-rls';

export type ClassroomGenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ClassroomGenerationJob {
  id: string;
  status: ClassroomGenerationJobStatus;
  step: ClassroomGenerationStep | 'queued' | 'failed';
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  inputSummary: {
    requirementPreview: string;
    hasPdf: boolean;
    pdfTextLength: number;
    pdfImageCount: number;
  };
  scenesGenerated: number;
  totalScenes?: number;
  result?: {
    classroomId: string;
    url: string;
    scenesCount: number;
  };
  error?: string;
}

function buildInputSummary(input: GenerateClassroomInput): ClassroomGenerationJob['inputSummary'] {
  return {
    requirementPreview:
      input.requirement.length > 200 ? `${input.requirement.slice(0, 197)}...` : input.requirement,
    hasPdf: !!input.pdfContent,
    pdfTextLength: input.pdfContent?.text.length || 0,
    pdfImageCount: input.pdfContent?.images.length || 0,
  };
}

async function ensureClassroomJobsSchema(): Promise<void> {
  await getClassroomPool().query(`
    CREATE TABLE IF NOT EXISTS classroom_jobs (
      id text PRIMARY KEY,
      status text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    -- 建表完成后锁定 public schema（拒绝 Supabase 公开 API，详见 lib/db-rls.ts）
    ${ENABLE_PUBLIC_RLS_SQL}
  `);
}

/** Transactional read-modify-write on a job row (replaces the in-process mutex). */
async function withJobTx(
  jobId: string,
  fn: (existing: ClassroomGenerationJob) => Promise<ClassroomGenerationJob>,
): Promise<ClassroomGenerationJob> {
  const client: PoolClient = await getClassroomPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT data FROM classroom_jobs WHERE id = $1 FOR UPDATE',
      [jobId],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      throw new Error(`Classroom generation job not found: ${jobId}`);
    }
    const updated = await fn(rows[0].data as ClassroomGenerationJob);
    await client.query(
      'UPDATE classroom_jobs SET data = $1::jsonb, status = $2, updated_at = now() WHERE id = $3',
      [JSON.stringify(updated), updated.status, jobId],
    );
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Max age (ms) before a "running" job without an active runner is considered stale. */
const STALE_JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function markStaleIfNeeded(job: ClassroomGenerationJob): ClassroomGenerationJob {
  if (job.status !== 'running') return job;
  const updatedAt = new Date(job.updatedAt).getTime();
  if (Date.now() - updatedAt > STALE_JOB_TIMEOUT_MS) {
    return {
      ...job,
      status: 'failed',
      step: 'failed',
      message: 'Job appears stale (no progress update for 30 minutes)',
      error: 'Stale job: process may have restarted during generation',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return job;
}

export function isValidClassroomJobId(jobId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(jobId);
}

export async function createClassroomGenerationJob(
  jobId: string,
  input: GenerateClassroomInput,
): Promise<ClassroomGenerationJob> {
  const now = new Date().toISOString();
  const job: ClassroomGenerationJob = {
    id: jobId,
    status: 'queued',
    step: 'queued',
    progress: 0,
    message: 'Classroom generation job queued',
    createdAt: now,
    updatedAt: now,
    inputSummary: buildInputSummary(input),
    scenesGenerated: 0,
  };

  await ensureClassroomJobsSchema();
  await getClassroomPool().query(
    `INSERT INTO classroom_jobs (id, status, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, now(), now())
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data = EXCLUDED.data, updated_at = now()`,
    [jobId, job.status, JSON.stringify(job)],
  );
  return job;
}

export async function readClassroomGenerationJob(
  jobId: string,
): Promise<ClassroomGenerationJob | null> {
  await ensureClassroomJobsSchema();
  const { rows } = await getClassroomPool().query('SELECT data FROM classroom_jobs WHERE id = $1', [
    jobId,
  ]);
  if (!rows.length) return null;
  return markStaleIfNeeded(rows[0].data as ClassroomGenerationJob);
}

export async function updateClassroomGenerationJob(
  jobId: string,
  patch: Partial<ClassroomGenerationJob>,
): Promise<ClassroomGenerationJob> {
  return withJobTx(jobId, async (existing) => ({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }));
}

export async function markClassroomGenerationJobRunning(
  jobId: string,
): Promise<ClassroomGenerationJob> {
  return withJobTx(jobId, async (existing) => ({
    ...existing,
    status: 'running',
    startedAt: existing.startedAt || new Date().toISOString(),
    message: 'Classroom generation started',
    updatedAt: new Date().toISOString(),
  }));
}

export async function updateClassroomGenerationJobProgress(
  jobId: string,
  progress: ClassroomGenerationProgress,
): Promise<ClassroomGenerationJob> {
  return updateClassroomGenerationJob(jobId, {
    status: 'running',
    step: progress.step,
    progress: progress.progress,
    message: progress.message,
    scenesGenerated: progress.scenesGenerated,
    totalScenes: progress.totalScenes,
  });
}

export async function markClassroomGenerationJobSucceeded(
  jobId: string,
  result: GenerateClassroomResult,
): Promise<ClassroomGenerationJob> {
  return updateClassroomGenerationJob(jobId, {
    status: 'succeeded',
    step: 'completed',
    progress: 100,
    message: 'Classroom generation completed',
    completedAt: new Date().toISOString(),
    scenesGenerated: result.scenesCount,
    result: {
      classroomId: result.id,
      url: result.url,
      scenesCount: result.scenesCount,
    },
  });
}

export async function markClassroomGenerationJobFailed(
  jobId: string,
  error: string,
): Promise<ClassroomGenerationJob> {
  return updateClassroomGenerationJob(jobId, {
    status: 'failed',
    step: 'failed',
    message: 'Classroom generation failed',
    completedAt: new Date().toISOString(),
    error,
  });
}
