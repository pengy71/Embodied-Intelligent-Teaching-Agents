// Supabase 全表诊断（prepare:false，稳定）—— 查询 teaching_* / runtime_* / document_*
// 用法: node --env-file=.env.local scripts/diagnose-supabase.cjs
const { Pool } = require('pg');

const cs = process.env.DATABASE_URL;
if (!cs) {
  console.error('DATABASE_URL 未设置');
  process.exit(1);
}

const pool = new Pool({ connectionString: cs, max: 3, prepare: false });

const OPENMAIC_RUNTIME = `
CREATE TABLE IF NOT EXISTS runtime_sessions (
  id TEXT PRIMARY KEY, stage_id TEXT NOT NULL, learner_key TEXT NOT NULL,
  kind TEXT NOT NULL, status TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_sessions_stage_learner_idx ON runtime_sessions (stage_id, learner_key);
CREATE INDEX IF NOT EXISTS runtime_sessions_learner_idx ON runtime_sessions (learner_key);
CREATE TABLE IF NOT EXISTS runtime_records (
  id TEXT NOT NULL, session_id TEXT NOT NULL REFERENCES runtime_sessions(id) ON DELETE CASCADE,
  seq BIGINT NOT NULL CHECK (seq >= 0), scene_id TEXT,
  created_at TEXT NOT NULL, data JSONB NOT NULL,
  CONSTRAINT runtime_records_session_seq_unique UNIQUE (session_id, seq)
);
CREATE INDEX IF NOT EXISTS runtime_records_session_scene_idx ON runtime_records (session_id, scene_id);
`;

const OPENMAIC_DOCUMENT = `
CREATE TABLE IF NOT EXISTS document_stages (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  interactive_mode BOOLEAN, task_engine_mode BOOLEAN,
  created_at DOUBLE PRECISION NOT NULL, updated_at DOUBLE PRECISION NOT NULL, data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS document_scenes (
  stage_id TEXT NOT NULL REFERENCES document_stages(id) ON DELETE CASCADE,
  id TEXT NOT NULL, scene_order DOUBLE PRECISION NOT NULL, data JSONB NOT NULL,
  PRIMARY KEY (stage_id, id)
);
CREATE INDEX IF NOT EXISTS document_scenes_stage_order_idx ON document_scenes (stage_id, scene_order, id);
CREATE TABLE IF NOT EXISTS document_outlines (
  stage_id TEXT PRIMARY KEY REFERENCES document_stages(id) ON DELETE CASCADE, data JSONB NOT NULL
);
`;

async function run() {
  const client = await pool.connect();
  try {
    const v = await client.query('SELECT version() AS v');
    console.log('连接成功:', v.rows[0].v.slice(0, 70));

    // 1. 列出所有相关表
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE 'teaching%' OR table_name LIKE 'runtime%' OR table_name LIKE 'document%')
       ORDER BY table_name`,
    );
    console.log('\n=== 现有表清单 ===');
    const existing = new Set(tables.rows.map((r) => r.table_name));
    for (const t of tables.rows) console.log('  -', t.table_name);

    // 2. 确保扩展
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    const ext = await client.query(`SELECT extname FROM pg_extension WHERE extname IN ('vector','pgcrypto')`);
    console.log('\n=== 扩展 ===');
    for (const r of ext.rows) console.log('  -', r.extname);

    // 3. 补建 OpenMAIC 表（如缺失）
    console.log('\n=== 补建 OpenMAIC 表 ===');
    for (const sql of OPENMAIC_RUNTIME.split(';')) {
      const s = sql.trim();
      if (s) {
        await client.query(s);
      }
    }
    for (const sql of OPENMAIC_DOCUMENT.split(';')) {
      const s = sql.trim();
      if (s) {
        await client.query(s);
      }
    }
    console.log('  runtime_sessions / runtime_records / document_stages / document_scenes / document_outlines 已确保存在');

    // 4. 统计每张表行数
    const allTables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE 'teaching%' OR table_name LIKE 'runtime%' OR table_name LIKE 'document%')
       ORDER BY table_name`,
    );
    console.log('\n=== 各表行数 ===');
    for (const r of allTables.rows) {
      const t = r.table_name;
      try {
        const c = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
        console.log(`  ${t}: ${c.rows[0].n} 行`);
      } catch (e) {
        console.log(`  ${t}: 读取失败 - ${e.message}`);
      }
    }
    console.log('\n诊断完成。');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('错误:', e.message);
  process.exit(1);
});
