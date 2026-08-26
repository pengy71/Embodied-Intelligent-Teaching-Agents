// 一次性安全修复：为 public schema 的全部表启用 Row-Level Security。
//
// 背景：Supabase 为 public 表自动生成公开 REST API（PostgREST），未启用
// RLS 的表可被任何持有项目 URL + anon key 的人读写（对应 Supabase 的
// rls_disabled_in_public / sensitive_columns_exposed Critical 告警）。
// 本应用经 postgres 角色直连（表 owner 默认绕过 RLS），启用 RLS 不影响
// 应用读写，只会封死公开 API。运行时代码已在各建表入口自动启用 RLS
// （见 lib/db-rls.ts），本脚本用于修复存量数据库。
//
// 用法：node scripts/enable-rls.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

// 从工作区 .env.local 读取连接串（不依赖 dotenv，保持零额外依赖）
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

// DDL 优先走会话模式 DIRECT_URL（5432，支持全部语句），否则退回 DATABASE_URL
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error('[FAIL] .env.local 中未找到 DIRECT_URL / DATABASE_URL');
  process.exit(1);
}

const LIST_TABLES = `
  SELECT c.relname AS table_name,
         pg_get_userbyid(c.relowner) AS owner,
         c.relrowsecurity AS rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname
`;

const ENABLE_RLS = `
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
  END LOOP;
END $$;
`;

function printTables(rows, label) {
  const off = rows.filter((r) => !r.rls);
  console.log(`\n${label}：public 共 ${rows.length} 张普通表`);
  for (const r of rows) {
    console.log(`  ${r.rls ? '[RLS ✓]' : '[RLS ✗]'} ${r.table_name}  (owner: ${r.owner})`);
  }
  return off;
}

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 20000 });
try {
  const who = await pool.query("select current_user as u, current_setting('server_version') as v");
  console.log('[OK] 连接成功，角色:', who.rows[0].u, '| PG:', who.rows[0].v);

  const before = (await pool.query(LIST_TABLES)).rows;
  const offBefore = printTables(before, '修复前');
  if (!before.length) {
    console.log('\npublic schema 没有普通表，无需处理。');
  } else {
    await pool.query(ENABLE_RLS);
    const after = (await pool.query(LIST_TABLES)).rows;
    const offAfter = printTables(after, '修复后');
    console.log(`\n已启用 RLS：${offBefore.length} 张新增锁定，剩余未启用：${offAfter.length} 张`);

    // 验证：以 postgres（表 owner）在 RLS 开启的表上读写，证明应用连接不受影响。
    await pool.query('CREATE TABLE public.__rls_probe (id int PRIMARY KEY)');
    await pool.query(ENABLE_RLS); // 锁定探针表
    await pool.query('INSERT INTO public.__rls_probe VALUES (1)');
    const seen = await pool.query('SELECT count(*)::int AS c FROM public.__rls_probe');
    await pool.query('DELETE FROM public.__rls_probe');
    await pool.query('DROP TABLE public.__rls_probe');
    if (seen.rows[0].c !== 1) throw new Error('探针读回失败');
    console.log('\n[OK] 探针验证通过：表 owner 在 RLS 开启后仍可正常 INSERT/SELECT/DELETE');
    console.log('     => 应用（postgres 直连）读写不受影响；公开 API（anon key）已被拒绝');
    if (offAfter.length) {
      console.log('\n[WARN] 仍有表未启用 RLS，请人工检查其 owner 是否为 postgres');
      process.exitCode = 1;
    }
  }
} catch (e) {
  console.error('\n[FAIL] ' + (e.message || e));
  process.exitCode = 1;
} finally {
  await pool.end();
}
