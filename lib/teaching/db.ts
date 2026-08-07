import { Pool, type QueryResult } from 'pg';

import {
  defaultKnowledgeEdges,
  defaultKnowledgeNodes,
  defaultLearningEvents,
  defaultStudents,
  defaultTeachingCourse,
} from './seed';
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
    CREATE TABLE IF NOT EXISTS teaching_knowledge_nodes (
      id text PRIMARY KEY,
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      title text NOT NULL,
      chapter_id text NOT NULL,
      chapter_title text NOT NULL,
      section_id text NOT NULL,
      section_title text NOT NULL,
      level text NOT NULL,
      dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
      mastery_baseline integer NOT NULL DEFAULT 0,
      order_index integer NOT NULL DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teaching_knowledge_edges (
      course_id text NOT NULL REFERENCES teaching_courses(id) ON DELETE CASCADE,
      source_id text NOT NULL REFERENCES teaching_knowledge_nodes(id) ON DELETE CASCADE,
      target_id text NOT NULL REFERENCES teaching_knowledge_nodes(id) ON DELETE CASCADE,
      relation text NOT NULL,
      PRIMARY KEY (course_id, source_id, target_id, relation)
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
      knowledge_node_id text NOT NULL REFERENCES teaching_knowledge_nodes(id) ON DELETE CASCADE,
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

  for (const node of defaultKnowledgeNodes) {
    await query(
      `
        INSERT INTO teaching_knowledge_nodes (
          id, course_id, title, chapter_id, chapter_title, section_id, section_title,
          level, dependencies, mastery_baseline, order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            chapter_id = EXCLUDED.chapter_id,
            chapter_title = EXCLUDED.chapter_title,
            section_id = EXCLUDED.section_id,
            section_title = EXCLUDED.section_title,
            level = EXCLUDED.level,
            dependencies = EXCLUDED.dependencies,
            mastery_baseline = EXCLUDED.mastery_baseline,
            order_index = EXCLUDED.order_index
      `,
      [
        node.id,
        defaultTeachingCourse.id,
        node.title,
        node.chapterId,
        node.chapterTitle,
        node.sectionId,
        node.sectionTitle,
        node.level,
        JSON.stringify(node.dependencies),
        node.masteryBaseline,
        node.orderIndex,
      ],
    );
  }

  for (const edge of defaultKnowledgeEdges) {
    await query(
      `
        INSERT INTO teaching_knowledge_edges (course_id, source_id, target_id, relation)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
      [defaultTeachingCourse.id, edge.source, edge.target, edge.relation],
    );
  }

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

function toKnowledgeNode(row: Record<string, unknown>): TeachingKnowledgeNode {
  return {
    id: String(row.id),
    title: String(row.title),
    chapterId: String(row.chapter_id),
    chapterTitle: String(row.chapter_title),
    sectionId: String(row.section_id),
    sectionTitle: String(row.section_title),
    level: row.level as TeachingKnowledgeNode['level'],
    dependencies: Array.isArray(row.dependencies) ? (row.dependencies as string[]) : [],
    masteryBaseline: Number(row.mastery_baseline ?? 0),
    orderIndex: Number(row.order_index ?? 0),
  };
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

export async function getKnowledgeGraph(courseId: string): Promise<{
  nodes: TeachingKnowledgeNode[];
  edges: TeachingKnowledgeEdge[];
}> {
  await ensureTeachingDatabase();
  const nodes = await query(
    `
      SELECT *
      FROM teaching_knowledge_nodes
      WHERE course_id = $1
      ORDER BY order_index ASC
    `,
    [courseId],
  );
  const edges = await query(
    `
      SELECT source_id, target_id, relation
      FROM teaching_knowledge_edges
      WHERE course_id = $1
    `,
    [courseId],
  );

  return {
    nodes: nodes.rows.map(toKnowledgeNode),
    edges: edges.rows.map((row) => ({
      source: String(row.source_id),
      target: String(row.target_id),
      relation: row.relation as TeachingKnowledgeEdge['relation'],
    })),
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
