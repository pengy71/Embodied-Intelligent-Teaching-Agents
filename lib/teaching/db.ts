import { Pool, type QueryResult } from 'pg';

import { defaultLearningEvents, defaultStudents, defaultTeachingCourse } from './seed';
import { loadKnowledge } from './store';
import {
  buildGraphEdges,
  getAllPoints,
  getPointChapter,
  getPointSection,
} from './knowledge-doc';
import type {
  TeachingAgentType,
  TeachingKnowledgeEdge,
  TeachingKnowledgeNode,
  TeachingLearningEvent,
  TeachingStudentProfile,
} from './types';

const POOL_KEY = '__openmaicTeachingPgPool';
const INIT_KEY = '__openmaicTeachingPgInit';

type TeachingGlobal = typeof globalThis & {
  __openmaicTeachingPgPool?: Pool;
  __openmaicTeachingPgInit?: Promise<void>;
};

const globalState = globalThis as TeachingGlobal;

export function getTeachingPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for teaching agents');
  }
  if (!globalState[POOL_KEY]) {
    globalState[POOL_KEY] = new Pool({ connectionString, max: 10 });
  }
  return globalState[POOL_KEY];
}

async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getTeachingPool().query<T>(text, params);
}

async function createSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS teaching_courses (
      id text PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_students (
      id text PRIMARY KEY,
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      name text NOT NULL,
      profile jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_learning_events (
      id text PRIMARY KEY,
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      student_id text NOT NULL REFERENCES teaching_students(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      knowledge_node_id text NOT NULL,
      score numeric,
      duration_minutes integer NOT NULL DEFAULT 0,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      occurred_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS teaching_learning_events_course_student_idx
      ON teaching_learning_events(course_id, student_id, occurred_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS teaching_learning_events_knowledge_idx
      ON teaching_learning_events(course_id, knowledge_node_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_agent_runs (
      id text PRIMARY KEY,
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      student_id text REFERENCES teaching_students(id) ON DELETE CASCADE,
      agent_type text NOT NULL,
      input_hash text NOT NULL,
      model_string text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS teaching_agent_runs_lookup_idx
      ON teaching_agent_runs(course_id, student_id, agent_type, created_at DESC)
  `);

  // Knowledge content now lives in teaching_knowledge (KnowledgeDoc, managed by
  // lib/teaching/store). Drop the legacy per-node tables and the learning_events
  // foreign key that pointed at them, so learning events can reference KnowledgeDoc
  // point ids directly. Idempotent: no-ops on a fresh database.
  await query(`
    ALTER TABLE teaching_learning_events
      DROP CONSTRAINT IF EXISTS teaching_learning_events_knowledge_node_id_fkey
  `);
  await query(`DROP TABLE IF EXISTS teaching_knowledge_edges`);
  await query(`DROP TABLE IF EXISTS teaching_knowledge_nodes`);
}

async function seedDefaults(): Promise<void> {
  await query(
    `
      INSERT INTO teaching_courses (id, title, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          updated_at = now()
    `,
    [defaultTeachingCourse.id, defaultTeachingCourse.title, defaultTeachingCourse.description],
  );

  for (const student of defaultStudents) {
    await query(
      `
        INSERT INTO teaching_students (id, course_id, name, profile)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            profile = EXCLUDED.profile,
            updated_at = now()
      `,
      [
        student.id,
        defaultTeachingCourse.id,
        student.name,
        JSON.stringify({
          goal: student.goal,
          level: student.level,
          preferences: student.preferences,
        }),
      ],
    );
  }

  for (const event of defaultLearningEvents) {
    await query(
      `
        INSERT INTO teaching_learning_events (
          id, course_id, student_id, event_type, knowledge_node_id,
          score, duration_minutes, payload, occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz)
        ON CONFLICT (id) DO UPDATE
        SET event_type = EXCLUDED.event_type,
            knowledge_node_id = EXCLUDED.knowledge_node_id,
            score = EXCLUDED.score,
            duration_minutes = EXCLUDED.duration_minutes,
            payload = EXCLUDED.payload,
            occurred_at = EXCLUDED.occurred_at
      `,
      [
        event.id,
        defaultTeachingCourse.id,
        event.studentId,
        event.eventType,
        event.knowledgeNodeId,
        event.score,
        event.durationMinutes,
        JSON.stringify(event.payload),
        event.occurredAt,
      ],
    );
  }
}

export async function ensureTeachingDatabase(): Promise<void> {
  if (!globalState[INIT_KEY]) {
    globalState[INIT_KEY] = (async () => {
      await createSchema();
      await seedDefaults();
    })().catch((error) => {
      globalState[INIT_KEY] = undefined;
      throw error;
    });
  }
  await globalState[INIT_KEY];
}

function toLearningEvent(row: Record<string, unknown>): TeachingLearningEvent {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    eventType: row.event_type as TeachingLearningEvent['eventType'],
    knowledgeNodeId: String(row.knowledge_node_id),
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    durationMinutes: Number(row.duration_minutes ?? 0),
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {},
    occurredAt:
      row.occurred_at instanceof Date
        ? row.occurred_at.toISOString()
        : new Date(String(row.occurred_at)).toISOString(),
  };
}

/**
 * Derive the teaching knowledge graph from the canonical KnowledgeDoc
 * (teaching_knowledge jsonb, editable by teachers via /api/teaching/knowledge).
 * This unifies the knowledge source: agents, students and teachers all see the
 * same nodes/edges the teacher builds, instead of a parallel seed table.
 */
export async function getKnowledgeGraph(_courseId: string): Promise<{
  nodes: TeachingKnowledgeNode[];
  edges: TeachingKnowledgeEdge[];
}> {
  await ensureTeachingDatabase();
  const doc = await loadKnowledge();
  const points = getAllPoints(doc);

  const nodes: TeachingKnowledgeNode[] = points.map((point, index) => {
    const chapter = getPointChapter(doc, point.id);
    const section = getPointSection(doc, point.id);
    return {
      id: point.id,
      title: point.title,
      chapterId: chapter?.id ?? '',
      chapterTitle: chapter?.title ?? '',
      sectionId: section?.id ?? '',
      sectionTitle: section?.title ?? '',
      level: 'knowledge',
      dependencies: point.prerequisites ?? [],
      masteryBaseline: 50,
      orderIndex: index + 1,
    };
  });

  const edges: TeachingKnowledgeEdge[] = buildGraphEdges(doc).map((edge) => ({
    source: edge.source,
    target: edge.target,
    relation: edge.type === 'prerequisite' ? 'prerequisite' : 'related',
  }));

  return { nodes, edges };
}

/** Record a single learning event emitted by a student activity (qa/practice/study). */
export async function insertLearningEvent(params: {
  courseId: string;
  studentId: string;
  eventType: TeachingLearningEvent['eventType'];
  knowledgeNodeId: string;
  score?: number | null;
  durationMinutes?: number;
  payload?: Record<string, unknown>;
}): Promise<TeachingLearningEvent> {
  await ensureTeachingDatabase();
  const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const score = params.score ?? null;
  const durationMinutes = params.durationMinutes ?? 0;
  const payload = params.payload ?? {};
  await query(
    `
      INSERT INTO teaching_learning_events (
        id, course_id, student_id, event_type, knowledge_node_id,
        score, duration_minutes, payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      id,
      params.courseId,
      params.studentId,
      params.eventType,
      params.knowledgeNodeId,
      score,
      durationMinutes,
      JSON.stringify(payload),
    ],
  );
  return {
    id,
    studentId: params.studentId,
    eventType: params.eventType,
    knowledgeNodeId: params.knowledgeNodeId,
    score,
    durationMinutes,
    payload,
    occurredAt: new Date().toISOString(),
  };
}

export async function getStudents(courseId: string): Promise<TeachingStudentProfile[]> {
  await ensureTeachingDatabase();
  const result = await query(
    `
      SELECT id, name, profile
      FROM teaching_students
      WHERE course_id = $1
      ORDER BY id ASC
    `,
    [courseId],
  );

  return result.rows.map((row) => {
    const profile =
      row.profile && typeof row.profile === 'object'
        ? (row.profile as Record<string, unknown>)
        : {};
    const preferences =
      profile.preferences && typeof profile.preferences === 'object'
        ? (profile.preferences as TeachingStudentProfile['preferences'])
        : { pace: '标准', style: '启发式提问', resourcePriority: 'balanced' };
    return {
      id: String(row.id),
      name: String(row.name),
      goal: String(profile.goal ?? ''),
      level: String(profile.level ?? ''),
      preferences,
    };
  });
}

export async function getStudentProfile(
  courseId: string,
  studentId: string,
): Promise<TeachingStudentProfile> {
  const students = await getStudents(courseId);
  const student = students.find((item) => item.id === studentId);
  if (!student) throw new Error(`Student ${studentId} not found in course ${courseId}`);
  return student;
}

export async function getLearningEvents(
  courseId: string,
  studentId?: string,
): Promise<TeachingLearningEvent[]> {
  await ensureTeachingDatabase();
  const result = studentId
    ? await query(
        `
          SELECT *
          FROM teaching_learning_events
          WHERE course_id = $1 AND student_id = $2
          ORDER BY occurred_at ASC
        `,
        [courseId, studentId],
      )
    : await query(
        `
          SELECT *
          FROM teaching_learning_events
          WHERE course_id = $1
          ORDER BY occurred_at ASC
        `,
        [courseId],
      );

  return result.rows.map(toLearningEvent);
}

export async function saveTeachingAgentRun(params: {
  id: string;
  courseId: string;
  studentId?: string;
  agentType: TeachingAgentType;
  inputHash: string;
  modelString: string;
  result: unknown;
}): Promise<void> {
  await ensureTeachingDatabase();
  await query(
    `
      INSERT INTO teaching_agent_runs (
        id, course_id, student_id, agent_type, input_hash, model_string, result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      params.id,
      params.courseId,
      params.studentId ?? null,
      params.agentType,
      params.inputHash,
      params.modelString,
      JSON.stringify(params.result),
    ],
  );
}

export async function getLatestTeachingAgentRun<T>(params: {
  courseId: string;
  studentId?: string;
  agentType: TeachingAgentType;
}): Promise<T | null> {
  await ensureTeachingDatabase();
  const result = await query(
    `
      SELECT result
      FROM teaching_agent_runs
      WHERE course_id = $1
        AND agent_type = $2
        AND (
          ($3::text IS NULL AND student_id IS NULL)
          OR student_id = $3::text
        )
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [params.courseId, params.agentType, params.studentId ?? null],
  );
  return (result.rows[0]?.result as T | undefined) ?? null;
}