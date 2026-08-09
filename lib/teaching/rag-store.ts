// RAG 向量存储层：teaching_chunks 表的 CRUD 操作。
// 复用 store.ts 的 pg Pool，pgvector 扩展提供向量类型与余弦相似度检索。

import { getPool, ensureTeachingSchema } from './store';
import type { ChunkInsert, SearchResult } from './types';

const DEFAULT_COURSE_ID = 'default';

/** 将 number[] 格式化为 pgvector 接受的文本：[0.1,0.2,...] */
function toPgVector(vec: number[]): string {
  return '[' + vec.join(',') + ']';
}

/** 批量插入文本块（含向量）。空数组直接返回。 */
export async function insertChunks(chunks: ChunkInsert[]): Promise<void> {
  if (chunks.length === 0) return;
  await ensureTeachingSchema();
  const pool = getPool();

  // 逐条插入（批量 VALUES 构建对 vector 类型较复杂，逐条更清晰可靠）
  for (const chunk of chunks) {
    await pool.query(
      `INSERT INTO teaching_chunks
         (id, course_id, resource_id, point_id, chapter_id, chunk_text, chunk_index, page_ref, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         chunk_text = EXCLUDED.chunk_text,
         page_ref = EXCLUDED.page_ref,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata,
         created_at = now()`,
      [
        chunk.id,
        chunk.courseId,
        chunk.resourceId ?? null,
        chunk.pointId ?? null,
        chunk.chapterId ?? null,
        chunk.chunkText,
        chunk.chunkIndex,
        chunk.pageRef ?? null,
        toPgVector(chunk.embedding),
        JSON.stringify(chunk.metadata ?? {}),
      ],
    );
  }
}

/**
 * 向量相似度检索：返回与查询向量最相似的 top-K 文本块。
 * 使用余弦距离 (<=>)，结果按相似度降序排列。
 */
export async function searchChunks(
  queryVec: number[],
  courseId: string = DEFAULT_COURSE_ID,
  k = 6,
): Promise<SearchResult[]> {
  await ensureTeachingSchema();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       id,
       chunk_text,
       page_ref,
       point_id,
       chapter_id,
       1 - (embedding <=> $1::vector) AS similarity
     FROM teaching_chunks
     WHERE course_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [toPgVector(queryVec), courseId, k],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    chunkText: String(r.chunk_text ?? ''),
    pageRef: r.page_ref !== null ? String(r.page_ref) : null,
    pointId: r.point_id !== null ? String(r.point_id) : null,
    chapterId: r.chapter_id !== null ? String(r.chapter_id) : null,
    similarity: Number(r.similarity ?? 0),
  }));
}

/** 删除指定资源的所有文本块（资源重新解析时清理旧块）。 */
export async function deleteChunksByResource(resourceId: string): Promise<void> {
  await ensureTeachingSchema();
  await getPool().query('DELETE FROM teaching_chunks WHERE resource_id = $1', [resourceId]);
}

/** 删除知识点派生块（resource_id IS NULL），供重建索引。 */
export async function deleteKnowledgeChunks(
  courseId: string = DEFAULT_COURSE_ID,
): Promise<void> {
  await ensureTeachingSchema();
  await getPool().query(
    'DELETE FROM teaching_chunks WHERE course_id = $1 AND resource_id IS NULL',
    [courseId],
  );
}

/** 统计文本块数量（状态检查/调试用）。 */
export async function countChunks(
  courseId: string = DEFAULT_COURSE_ID,
): Promise<{ total: number; knowledge: number; resource: number }> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE resource_id IS NULL)::int AS knowledge,
       COUNT(*) FILTER (WHERE resource_id IS NOT NULL)::int AS resource
     FROM teaching_chunks
     WHERE course_id = $1`,
    [courseId],
  );
  const r = rows[0] ?? { total: 0, knowledge: 0, resource: 0 };
  return {
    total: Number(r.total ?? 0),
    knowledge: Number(r.knowledge ?? 0),
    resource: Number(r.resource ?? 0),
  };
}