import { Pool, type QueryResult } from 'pg';

import { enableRlsOnPublicTables } from '../db-rls';
import {
  defaultAccounts,
  defaultLearningEvents,
  defaultStudents,
  defaultTeachingCourse,
} from './seed';
import { hashPassword } from '../auth/password';
import { loadKnowledge } from './store';
import { buildGraphEdges, getAllPoints, getPointChapter, getPointSection } from './knowledge-doc';
import {
  normalizeStudentAssistantPreferences,
  type StudentAssistantPreferences,
} from './student-assistant';
import type {
  StageTest,
  StageTestConfig,
  StageTestStatus,
  StageTestSubmission,
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
    // Supabase 通过 PgBouncer 事务模式连接池（端口 6543）暴露 DATABASE_URL。
    // node-postgres 在该模式下保持默认配置即可（不使用命名 prepared statement）。
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

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_accounts (
      id text PRIMARY KEY,
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL,
      display_name text NOT NULL,
      student_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS teaching_accounts_username_idx
      ON teaching_accounts(username)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_stage_tests (
      id text PRIMARY KEY,
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      config jsonb NOT NULL DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'published',
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      due_at timestamptz
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS teaching_stage_tests_course_idx
      ON teaching_stage_tests(course_id, created_at DESC)
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS teaching_stage_test_submissions (
      id text PRIMARY KEY,
      test_id text NOT NULL REFERENCES teaching_stage_tests(id) ON DELETE CASCADE,
      student_id text NOT NULL REFERENCES teaching_students(id) ON DELETE CASCADE,
      score integer NOT NULL DEFAULT 0,
      detail jsonb NOT NULL DEFAULT '{}'::jsonb,
      submitted_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (test_id, student_id)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS teaching_stage_test_submissions_test_idx
      ON teaching_stage_test_submissions(test_id, student_id)
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

  // 建表完成后锁定 public schema（拒绝 Supabase 公开 API，详见 lib/db-rls.ts）。
  await enableRlsOnPublicTables(getTeachingPool());
}

async function upsertLearningEvents(
  courseId: string,
  events: TeachingLearningEvent[],
): Promise<void> {
  const chunkSize = 200;
  for (let start = 0; start < events.length; start += chunkSize) {
    const chunk = events.slice(start, start + chunkSize);
    const params: unknown[] = [];
    const rows: string[] = [];
    chunk.forEach((event, index) => {
      const base = index * 9;
      rows.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::jsonb, $${base + 9}::timestamptz)`,
      );
      params.push(
        event.id,
        courseId,
        event.studentId,
        event.eventType,
        event.knowledgeNodeId,
        event.score,
        event.durationMinutes,
        JSON.stringify(event.payload),
        event.occurredAt,
      );
    });
    await query(
      `INSERT INTO teaching_learning_events (
         id, course_id, student_id, event_type, knowledge_node_id,
         score, duration_minutes, payload, occurred_at
       ) VALUES ${rows.join(', ')}
       ON CONFLICT (id) DO UPDATE SET
         event_type = EXCLUDED.event_type,
         knowledge_node_id = EXCLUDED.knowledge_node_id,
         score = EXCLUDED.score,
         duration_minutes = EXCLUDED.duration_minutes,
         payload = EXCLUDED.payload,
         occurred_at = EXCLUDED.occurred_at`,
      params,
    );
  }
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

  // Clean up students/accounts no longer in the seed data (e.g. after
  // renumbering student ids). Cascades to learning_events and agent_runs.
  await query(`DELETE FROM teaching_students WHERE course_id = $1 AND id <> ALL($2::text[])`, [
    defaultTeachingCourse.id,
    defaultStudents.map((s) => s.id),
  ]);
  await query(`DELETE FROM teaching_accounts WHERE id <> ALL($1::text[])`, [
    defaultAccounts.map((a) => a.id),
  ]);
  for (const student of defaultStudents) {
    await query(
      `
        INSERT INTO teaching_students (id, course_id, name, profile)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
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

  // Seed events live in the `seed-` id namespace so the whole set can be
  // replaced on every re-seed without touching real usage events, which keep
  // their own `ev-<timestamp>` ids. Legacy `ev-NNN` seed ids are cleaned up too.
  await query(`DELETE FROM teaching_learning_events WHERE id ~ '^seed-' OR id ~ '^ev-[0-9]{3}$'`);
  await upsertLearningEvents(defaultTeachingCourse.id, defaultLearningEvents);

  // Invalidate cached agent-run snapshots (teacher analytics, student guidance,
  // etc.) so dashboards recompute from the refreshed learning events instead of
  // serving stale results generated before the re-seed.
  await query(`DELETE FROM teaching_agent_runs WHERE course_id = $1`, [defaultTeachingCourse.id]);

  for (const account of defaultAccounts) {
    const passwordHash = await hashPassword(account.password);
    await query(
      `
        INSERT INTO teaching_accounts (id, username, password_hash, role, display_name, student_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET username = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            display_name = EXCLUDED.display_name,
            student_id = EXCLUDED.student_id,
            updated_at = now()
      `,
      [
        account.id,
        account.username,
        passwordHash,
        account.role,
        account.displayName,
        account.studentId,
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
export async function getStudentAssistantPreferences(
  courseId: string,
  studentId: string,
): Promise<StudentAssistantPreferences | null> {
  await ensureTeachingDatabase();
  const result = await query(
    `SELECT profile FROM teaching_students WHERE course_id = $1 AND id = $2`,
    [courseId, studentId],
  );
  const profile = result.rows[0]?.profile;
  const stored =
    profile && typeof profile === 'object'
      ? (profile as Record<string, unknown>).assistantPreferences
      : undefined;
  return stored === undefined ? null : normalizeStudentAssistantPreferences(stored);
}

export async function saveStudentAssistantPreferences(
  courseId: string,
  studentId: string,
  preferences: StudentAssistantPreferences,
): Promise<void> {
  await ensureTeachingDatabase();
  const result = await query(
    `SELECT profile FROM teaching_students WHERE course_id = $1 AND id = $2`,
    [courseId, studentId],
  );
  if (result.rows.length === 0) return;
  const profile =
    result.rows[0]?.profile && typeof result.rows[0].profile === 'object'
      ? (result.rows[0].profile as Record<string, unknown>)
      : {};
  await query(
    `UPDATE teaching_students
       SET profile = $3::jsonb, updated_at = now()
     WHERE course_id = $1 AND id = $2`,
    [courseId, studentId, JSON.stringify({ ...profile, assistantPreferences: preferences })],
  );
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

// === 阶段测试 ===

export async function createStageTest(input: {
  id: string;
  courseId: string;
  title: string;
  description: string;
  config: StageTestConfig;
  status: string;
  createdBy: string;
  dueAt?: string | null;
}): Promise<StageTest> {
  await ensureTeachingDatabase();
  await query(
    `INSERT INTO teaching_stage_tests (id, course_id, title, description, config, status, created_by, due_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
    [
      input.id,
      input.courseId,
      input.title,
      input.description,
      JSON.stringify(input.config),
      input.status,
      input.createdBy,
      input.dueAt ?? null,
    ],
  );
  const test = await getStageTest(input.id);
  if (!test) throw new Error('failed to read back created stage test');
  return test;
}

export async function getStageTest(id: string): Promise<StageTest | null> {
  await ensureTeachingDatabase();
  const result = await query(`SELECT * FROM teaching_stage_tests WHERE id = $1`, [id]);
  return result.rows.length ? rowToStageTest(result.rows[0]) : null;
}

export async function listStageTests(courseId: string): Promise<StageTest[]> {
  await ensureTeachingDatabase();
  const result = await query(
    `SELECT * FROM teaching_stage_tests WHERE course_id = $1 ORDER BY created_at DESC`,
    [courseId],
  );
  return result.rows.map(rowToStageTest);
}

export async function deleteStageTest(id: string): Promise<void> {
  await ensureTeachingDatabase();
  await query(`DELETE FROM teaching_stage_tests WHERE id = $1`, [id]);
}

export async function upsertStageTestSubmission(input: {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  detail: Record<string, unknown>;
}): Promise<void> {
  await ensureTeachingDatabase();
  await query(
    `INSERT INTO teaching_stage_test_submissions (id, test_id, student_id, score, detail)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (test_id, student_id) DO UPDATE
       SET score = EXCLUDED.score, detail = EXCLUDED.detail, submitted_at = now()`,
    [input.id, input.testId, input.studentId, input.score, JSON.stringify(input.detail)],
  );
}

export async function getStudentSubmissions(
  courseId: string,
  studentId: string,
): Promise<StageTestSubmission[]> {
  await ensureTeachingDatabase();
  const result = await query(
    `SELECT s.* FROM teaching_stage_test_submissions s
     JOIN teaching_stage_tests t ON t.id = s.test_id
     WHERE t.course_id = $1 AND s.student_id = $2`,
    [courseId, studentId],
  );
  return result.rows.map(rowToSubmission);
}

function rowToStageTest(r: Record<string, unknown>): StageTest {
  const config = (r.config as StageTestConfig | undefined) ?? {
    chapterIds: [],
    count: 5,
    difficulty: 'mixed',
  };
  return {
    id: String(r.id),
    courseId: String(r.course_id),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    config,
    status: String(r.status ?? 'published') as StageTestStatus,
    createdBy: String(r.created_by ?? ''),
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
    dueAt: r.due_at ? (r.due_at instanceof Date ? r.due_at.toISOString() : String(r.due_at)) : null,
  };
}

function rowToSubmission(r: Record<string, unknown>): StageTestSubmission {
  return {
    id: String(r.id),
    testId: String(r.test_id),
    studentId: String(r.student_id),
    score: Number(r.score ?? 0),
    detail: (r.detail ?? {}) as Record<string, unknown>,
    submittedAt:
      r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at ?? ''),
  };
}
