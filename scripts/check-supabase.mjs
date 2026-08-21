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

const url = env.DATABASE_URL;
const direct = env.DIRECT_URL;
console.log(
  'DATABASE_URL  ->',
  new URL(url).host + new URL(url).pathname,
  '(port ' + new URL(url).port + ')',
);
console.log(
  'DIRECT_URL    ->',
  new URL(direct).host + new URL(direct).pathname,
  '(port ' + new URL(direct).port + ')',
);

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 20000 });
try {
  const v = await pool.query('select version() as v');
  console.log('\n[OK] 连接成功');
  console.log('  Postgres 版本:', v.rows[0].v.split(',').slice(0, 1).join('').trim());

  const ext = await pool.query(
    "select extname, extversion from pg_extension where extname in ('vector','pgcrypto') order by extname",
  );
  console.log(
    '  已装扩展:',
    ext.rows.map((r) => `${r.extname}@${r.extversion}`).join(', ') || '(无 vector/pgcrypto)',
  );

  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  console.log(
    '  public 表:',
    tables.rows.length ? tables.rows.map((r) => r.table_name).join(', ') : '(空)',
  );

  const rowCnt = await pool
    .query(
      "select table_name, (xpath('/row/c/text()', query_to_xml('select count(*) c from public.' || quote_ident(table_name), true, true, '')))[1]::text::int as cnt from information_schema.tables where table_schema='public' and table_name like 'teaching%' order by table_name",
    )
    .catch(() => ({ rows: [] }));
  if (rowCnt.rows.length) {
    console.log('  teaching_* 行数:');
    for (const r of rowCnt.rows) console.log('    ' + r.table_name + ' = ' + r.cnt);
  }
} catch (e) {
  console.error('\n[FAIL] ' + (e.message || e));
  process.exitCode = 1;
} finally {
  await pool.end();
}
