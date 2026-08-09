// 教学知识/资源的 Postgres 存储层（无本地文件，面向部署）
// 复用项目既有 pg 依赖与 DATABASE_URL，复刻 app/api/persistence 的连接模式。

import { Pool, type PoolClient } from 'pg';
import { seedKnowledgeDoc, type KnowledgeDoc } from '@/lib/teaching/knowledge-doc';

export type ResourceStatus = 'pending' | 'parsing' | 'extracting' | 'ready' | 'failed';

export interface TeachingResource {
  id: string;
  name: string;
  type: string; // pdf/ppt/pptx/docx/txt
  mime: string;
  size: number;
  status: ResourceStatus;
  parsedText?: string | null;
  pointIds: string[];
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COURSE_ID = 'default';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function isTeachingStoreConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureTeachingSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS teaching_knowledge (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS teaching_resources (
      id text PRIMARY KEY,
      name text NOT NULL,
      type text NOT NULL,
      mime text NOT NULL DEFAULT '',
      size bigint NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending',
      parsed_text text,
      point_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      error text,
      content bytea,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS teaching_student_progress (
      student_id text NOT NULL,
      point_id text NOT NULL,
      status text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (student_id, point_id)
    );
    -- RAG 向量存储：教材原文分块 + 知识点向量
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS teaching_chunks (
      id text PRIMARY KEY,
      course_id text NOT NULL DEFAULT 'default',
      resource_id text,
      point_id text,
      chapter_id text,
      chunk_text text NOT NULL,
      chunk_index int NOT NULL,
      page_ref text,
      embedding vector(2048),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    -- 不创建 HNSW 索引：GLM embedding-3 输出 2048 维超过 HNSW 上限 2000。课程知识库规模小，精确检索足够快。
    CREATE INDEX IF NOT EXISTS teaching_chunks_resource_idx
      ON teaching_chunks(resource_id);
    CREATE INDEX IF NOT EXISTS teaching_chunks_point_idx
      ON teaching_chunks(point_id);
    -- Q&A 历史记录
    CREATE TABLE IF NOT EXISTS teaching_qa_history (
      id text PRIMARY KEY,
      student_id text NOT NULL DEFAULT 'default',
      question text NOT NULL,
      answer text NOT NULL,
      sources jsonb NOT NULL DEFAULT '[]'::jsonb,
      related_points jsonb NOT NULL DEFAULT '[]'::jsonb,
      profile jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS teaching_qa_history_student_idx
      ON teaching_qa_history(student_id, created_at DESC);
    -- 知识点讲解缓存：pointId -> classroomId，避免同一知识点重复生成
    CREATE TABLE IF NOT EXISTS teaching_learn_cache (
      point_id text PRIMARY KEY,
      classroom_id text NOT NULL,
      job_id text,
      scenes_count int,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

  `);
}

/** 读取知识文档；首次空表用种子播种，保留原有 17 章内容。 */
export async function loadKnowledge(): Promise<KnowledgeDoc> {
  await ensureTeachingSchema();
  const p = getPool();
  const { rows } = await p.query('SELECT data FROM teaching_knowledge WHERE id = $1', [
    DEFAULT_COURSE_ID,
  ]);
  if (rows.length === 0) {
    const seed = seedKnowledgeDoc();
    await p.query(
      'INSERT INTO teaching_knowledge (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [DEFAULT_COURSE_ID, JSON.stringify(seed)],
    );
    return seed;
  }
  return rows[0].data as KnowledgeDoc;
}

/** 在事务中锁定知识行并交给回调修改；回调返回新文档（或原地改 doc 后返回 void）。
 *  同一 client 可用于原子地更新资源状态，保证"合并知识点"与"资源置 ready"同时成败。 */
export async function withKnowledgeTx<T>(
  fn: (client: PoolClient, doc: KnowledgeDoc) => Promise<T>,
): Promise<T> {
  await ensureTeachingSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT data FROM teaching_knowledge WHERE id = $1 FOR UPDATE',
      [DEFAULT_COURSE_ID],
    );
    let doc: KnowledgeDoc;
    if (rows.length === 0) {
      doc = seedKnowledgeDoc();
      await client.query(
        'INSERT INTO teaching_knowledge (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [DEFAULT_COURSE_ID, JSON.stringify(doc)],
      );
      const r2 = await client.query(
        'SELECT data FROM teaching_knowledge WHERE id = $1 FOR UPDATE',
        [DEFAULT_COURSE_ID],
      );
      doc = r2.rows[0].data as KnowledgeDoc;
    } else {
      doc = rows[0].data as KnowledgeDoc;
    }
    const result = await fn(client, doc);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function saveKnowledgeInTx(client: PoolClient, doc: KnowledgeDoc): Promise<void> {
  await client.query('UPDATE teaching_knowledge SET data = $1, updated_at = now() WHERE id = $2', [
    JSON.stringify(doc),
    DEFAULT_COURSE_ID,
  ]);
}

/** 删除指定知识点（按 id 在所有章节/小节中查找并移除），返回是否删除成功。 */
export async function deletePoint(pointId: string): Promise<boolean> {
  return withKnowledgeTx(async (client, doc) => {
    let removed = false;
    for (const chapter of doc.chapters) {
      for (const section of chapter.sections) {
        const before = section.points.length;
        section.points = section.points.filter((p) => p.id !== pointId);
        if (section.points.length < before) removed = true;
      }
    }
    if (removed) {
      await saveKnowledgeInTx(client, doc);
    }
    return removed;
  });
}

export interface ResourcePatch {
  status?: ResourceStatus;
  parsedText?: string | null;
  pointIds?: string[];
  error?: string | null;
}

export async function updateResource(
  id: string,
  patch: ResourcePatch,
  client?: PoolClient,
): Promise<void> {
  const q = client ?? getPool();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (patch.status !== undefined) {
    sets.push(`status = $${i++}`);
    vals.push(patch.status);
  }
  if (patch.parsedText !== undefined) {
    sets.push(`parsed_text = $${i++}`);
    vals.push(patch.parsedText);
  }
  if (patch.pointIds !== undefined) {
    sets.push(`point_ids = $${i++}`);
    vals.push(JSON.stringify(patch.pointIds));
  }
  if (patch.error !== undefined) {
    sets.push(`error = $${i++}`);
    vals.push(patch.error);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);
  vals.push(id);
  await q.query(`UPDATE teaching_resources SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

export async function createResource(input: {
  id: string;
  name: string;
  type: string;
  mime: string;
  size: number;
  content: Buffer;
}): Promise<TeachingResource> {
  await ensureTeachingSchema();
  const now = new Date().toISOString();
  await getPool().query(
    `INSERT INTO teaching_resources (id, name, type, mime, size, status, point_ids, content, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', '[]'::jsonb, $6, $7, $7)`,
    [input.id, input.name, input.type, input.mime, input.size, input.content, now],
  );
  const r = await getResource(input.id);
  if (!r) throw new Error('failed to read back created resource');
  return r;
}

export async function listResources(): Promise<TeachingResource[]> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT id, name, type, mime, size, status, parsed_text, point_ids, error, created_at, updated_at
     FROM teaching_resources ORDER BY created_at DESC`,
  );
  return rows.map(rowToResource);
}

export async function getResource(id: string): Promise<TeachingResource | null> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT id, name, type, mime, size, status, parsed_text, point_ids, error, created_at, updated_at
     FROM teaching_resources WHERE id = $1`,
    [id],
  );
  return rows.length ? rowToResource(rows[0]) : null;
}

export async function getResourceContent(
  id: string,
): Promise<{ buffer: Buffer; mime: string; name: string; size: number } | null> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    'SELECT content, mime, name, size FROM teaching_resources WHERE id = $1',
    [id],
  );
  if (!rows.length) return null;
  return {
    buffer: rows[0].content as Buffer,
    mime: rows[0].mime ?? '',
    name: rows[0].name,
    size: Number(rows[0].size ?? 0),
  };
}


// === 学生学习进度 ===

export type StudentProgressStatus = "learning" | "learned";

export interface StudentProgressEntry {
  pointId: string;
  status: StudentProgressStatus;
  updatedAt: string;
}

export async function getProgress(studentId: string): Promise<StudentProgressEntry[]> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    "SELECT point_id, status, updated_at FROM teaching_student_progress WHERE student_id = $1",
    [studentId],
  );
  return rows.map(
    (r: { point_id: string; status: string; updated_at: string }) => ({
      pointId: r.point_id,
      status: r.status as StudentProgressStatus,
      updatedAt: r.updated_at,
    }),
  );
}

export async function upsertProgress(
  studentId: string,
  pointId: string,
  status: StudentProgressStatus,
): Promise<void> {
  await ensureTeachingSchema();
  await getPool().query(
    "INSERT INTO teaching_student_progress (student_id, point_id, status, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (student_id, point_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()",
    [studentId, pointId, status],
  );
}


// === 知识点讲解缓存（pointId -> classroomId）===

export interface LearnCacheEntry {
  pointId: string;
  classroomId: string;
  jobId: string | null;
  scenesCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function getLearnCache(pointId: string): Promise<LearnCacheEntry | null> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT point_id, classroom_id, job_id, scenes_count, created_at, updated_at
     FROM teaching_learn_cache WHERE point_id = $1`,
    [pointId],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    pointId: r.point_id,
    classroomId: r.classroom_id,
    jobId: r.job_id ?? null,
    scenesCount: r.scenes_count ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function upsertLearnCache(
  pointId: string,
  classroomId: string,
  jobId: string | null,
  scenesCount: number | null,
): Promise<void> {
  await ensureTeachingSchema();
  await getPool().query(
    `INSERT INTO teaching_learn_cache (point_id, classroom_id, job_id, scenes_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, now(), now())
     ON CONFLICT (point_id) DO UPDATE
       SET classroom_id = EXCLUDED.classroom_id,
           job_id = EXCLUDED.job_id,
           scenes_count = EXCLUDED.scenes_count,
           updated_at = now()`,
    [pointId, classroomId, jobId, scenesCount],
  );
}
export interface PointResourceExcerpt {
  id: string;
  name: string;
  type: string;
  excerpt: string;
}

export async function getResourcesForPoint(
  pointId: string,
  maxChars = 4000,
  limit = 3,
): Promise<PointResourceExcerpt[]> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    "SELECT id, name, type, parsed_text FROM teaching_resources WHERE status = $1 AND parsed_text IS NOT NULL AND point_ids @> $2::jsonb ORDER BY updated_at DESC LIMIT $3",
    ["ready", JSON.stringify([pointId]), limit],
  );
  return rows.map(
    (r: { id: string; name: string; type: string; parsed_text: string | null }) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      excerpt: (r.parsed_text ?? "").slice(0, maxChars),
    }),
  );
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToResource(r: any): TeachingResource {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    mime: r.mime ?? '',
    size: Number(r.size ?? 0),
    status: r.status as ResourceStatus,
    parsedText: r.parsed_text ?? null,
    pointIds: Array.isArray(r.point_ids) ? r.point_ids : [],
    error: r.error ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
