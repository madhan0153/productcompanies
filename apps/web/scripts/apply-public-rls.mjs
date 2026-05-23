// One-shot helper to apply Phase L's public-RLS fix to the live DB.
//
// Why this exists: Supabase's PostgREST surface does not allow arbitrary DDL,
// and our service-role key alone can't run CREATE POLICY. The cleanest path
// is to print the exact SQL block for paste into Studio → SQL editor.
//
// Run:   node apps/web/scripts/apply-public-rls.mjs
// Then:  copy the printed block, paste it into Supabase Studio → SQL editor,
//        click Run. Idempotent — safe to re-run any time.

const sql = `-- ProdMatch — Phase L: open public-read on companies + active jobs.
-- The landing page hero, /companies, /cities, /salaries, etc. all hit
-- as anon. Previously RLS only allowed reads to 'authenticated', so
-- public pages silently fell back to curated metadata and showed
-- "Tracking 51 product companies · daily crawl" instead of the live
-- job count. This block re-grants:
--
--   companies   → anon + authenticated (everything)
--   jobs        → anon (only is_active = true), authenticated (everything)
--
-- Writes still happen via service-role only. Safe to re-run.

drop policy if exists "companies_read_authed" on public.companies;
drop policy if exists "companies_read_public" on public.companies;
create policy "companies_read_public"
  on public.companies for select
  to anon, authenticated
  using (true);

drop policy if exists "jobs_read_authed" on public.jobs;
drop policy if exists "jobs_read_active_public" on public.jobs;
drop policy if exists "jobs_read_authenticated" on public.jobs;
create policy "jobs_read_active_public"
  on public.jobs for select
  to anon
  using (is_active = true);
create policy "jobs_read_authenticated"
  on public.jobs for select
  to authenticated
  using (true);
`;

console.log(sql);
