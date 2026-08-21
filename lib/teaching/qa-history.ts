import { getPool, ensureTeachingSchema } from './store';
import type { QASource } from './types';

export interface QAHistoryRecord {
  id: string;
  question: string;
  answer: string;
  sources: QASource[];
  relatedPoints: Array<{
    id: string;
    title: string;
    summary?: string;
    chapter?: string;
  }>;
  profile: {
    teachingStyle?: string;
    depth?: string;
  };
  createdAt: string;
}

interface SaveQARecordInput {
  studentId: string;
  question: string;
  answer: string;
  sources: QASource[];
  relatedPoints: QAHistoryRecord['relatedPoints'];
  profile: Record<string, unknown>;
}

export async function saveQARecord(input: SaveQARecordInput): Promise<void> {
  await ensureTeachingSchema();
  const id = `qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await getPool().query(
    `INSERT INTO teaching_qa_history (id, student_id, question, answer, sources, related_points, profile)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.studentId,
      input.question,
      input.answer,
      JSON.stringify(input.sources),
      JSON.stringify(input.relatedPoints),
      JSON.stringify(input.profile),
    ],
  );
}

export async function listQAHistory(
  studentId: string,
  limit = 50,
  offset = 0,
): Promise<QAHistoryRecord[]> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT id, question, answer, sources, related_points, profile, created_at
     FROM teaching_qa_history
     WHERE student_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [studentId, limit, offset],
  );
  return rows.map((row) => ({
    id: String(row.id),
    question: String(row.question ?? ''),
    answer: String(row.answer ?? ''),
    sources: Array.isArray(row.sources) ? row.sources : [],
    relatedPoints: Array.isArray(row.related_points) ? row.related_points : [],
    profile: row.profile ?? {},
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
  }));
}

export async function countQAHistory(studentId: string): Promise<number> {
  await ensureTeachingSchema();
  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS count FROM teaching_qa_history WHERE student_id = $1`,
    [studentId],
  );
  return rows[0]?.count ?? 0;
}
