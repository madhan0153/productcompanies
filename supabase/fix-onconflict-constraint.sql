-- One-time migration: replace the partial unique index on jobs
-- (company_id, external_id) with a real unique CONSTRAINT, so that
-- PostgREST's onConflict spec can actually use it.
--
-- Background: the legacy index was defined as
--   create unique index ... on public.jobs(company_id, external_id)
--   where external_id is not null;
-- That partial WHERE clause makes Postgres reject ON CONFLICT (company_id,
-- external_id) — the conflict target must match the index spec exactly,
-- and PostgREST has no way to inject the WHERE clause.
--
-- Safe to run once. Idempotent — re-running is a no-op.

begin;

-- Drop the partial index if it exists (the redundant constraint we're
-- about to add will replace it functionally).
drop index if exists public.ux_jobs_company_external;

-- Add the unique CONSTRAINT (named, so it survives schema reloads).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ux_jobs_company_external'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint ux_jobs_company_external unique (company_id, external_id);
  end if;
end $$;

commit;

-- Verify:
select conname, contype, conrelid::regclass::text as on_table
  from pg_constraint
 where conname = 'ux_jobs_company_external';
-- Expected: one row with contype = 'u' (unique)
