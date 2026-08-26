// Supabase 会为 public schema 的每张表自动生成公开 REST API（PostgREST）。
// 未启用 RLS 的表，任何拿到项目 URL 与 anon key 的人都能读写全部数据，
// 包括 teaching_accounts.password_hash 等敏感列（对应 Supabase 的
// rls_disabled_in_public / sensitive_columns_exposed Critical 告警）。
//
// 本应用不使用 Supabase JS SDK，所有读写都通过 DATABASE_URL 以 postgres
// 角色直连；表 owner 默认绕过 RLS，因此对 public 全表启用 RLS 且不创建
// 任何 policy：应用读写完全不受影响，公开 API（anon/authenticated）的
// 所有请求都会被拒绝。各建表入口（lib/teaching/db.ts、store.ts、
// classroom-storage.ts、classroom-job-store.ts、/api/persistence 路由）
// 在建表后调用本模块，保证新建表也会自动锁定。

/** 幂等：为 public schema 中所有未启用 RLS 的普通表启用 RLS。 */
export const ENABLE_PUBLIC_RLS_SQL = `
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

export async function enableRlsOnPublicTables(queryable: {
  query(text: string): Promise<unknown>;
}): Promise<void> {
  await queryable.query(ENABLE_PUBLIC_RLS_SQL);
}
