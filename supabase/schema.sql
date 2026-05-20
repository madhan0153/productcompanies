-- =============================================================================
-- ProdMatch.ai — Consolidated Idempotent Schema
-- =============================================================================
-- Paste this entire file into the Supabase SQL editor and run.
-- Safe to re-run any number of times; will not create duplicates or errors.
--
-- Sections:
--   1. Extensions
--   2. Enums
--   3. Helper functions
--   4. Tables + indexes
--   5. updated_at triggers
--   6. RLS enable + policies
--   7. Storage bucket + policies (resumes)
--   8. Seed: 18 approved product companies
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
-- pg_cron / pg_net / vector are enabled in Supabase via the Database → Extensions UI
-- when needed; uncomment if your project has them available.
-- create extension if not exists "pg_cron";
-- create extension if not exists "pg_net";
-- create extension if not exists "vector";


-- -----------------------------------------------------------------------------
-- 2. ENUMS  (idempotent via duplicate_object catch)
-- -----------------------------------------------------------------------------
do $$ begin
  create type consent_purpose as enum ('account', 'matching', 'digest_email', 'analytics');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type digest_frequency as enum ('weekly', 'off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dpdp_event_type as enum (
    'consent_granted', 'consent_revoked',
    'export_requested', 'export_delivered',
    'erasure_requested', 'erasure_completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type crawl_status as enum ('running', 'success', 'partial', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type seniority_level as enum ('intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'manager', 'director');
exception when duplicate_object then null; end $$;

-- Phase F+: extend seniority_level with values that the normaliser already produces.
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent (PG12+); must run as a
-- top-level statement (not inside a DO block, hence no exception wrapper).
alter type seniority_level add value if not exists 'lead';
alter type seniority_level add value if not exists 'vp';


-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Generic updated_at trigger fn
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Freshness score (0-100): newer = higher
create or replace function public.compute_freshness(posted_at timestamptz, last_seen_at timestamptz)
returns numeric
language plpgsql
stable
as $$
declare
  age_days numeric;
begin
  if posted_at is null and last_seen_at is null then
    return 0;
  end if;
  age_days := extract(epoch from (now() - coalesce(posted_at, last_seen_at))) / 86400.0;
  if age_days <= 0 then return 100; end if;
  if age_days >= 60 then return 0; end if;
  return greatest(0, least(100, round((100 - (age_days * 100.0 / 60.0))::numeric, 2)));
end;
$$;

-- Mark jobs as stale if they were not seen in the latest crawl run for a company
create or replace function public.mark_stale_jobs(company_uuid uuid, run_started timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.jobs
     set is_active = false,
         updated_at = now()
   where company_id = company_uuid
     and is_active = true
     and (last_seen_at is null or last_seen_at < run_started);
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.mark_stale_jobs(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_stale_jobs(uuid, timestamptz) to service_role;

-- DPDP right-to-erasure. Service-role callable.
-- Removes all PII rows for the user, anonymizes immutable audit refs, logs event.
create or replace function public.request_user_erasure(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete owned data
  delete from public.interview_notes where application_id in (
    select id from public.applications where user_id = uid
  );
  delete from public.applications where user_id = uid;
  delete from public.matches where user_id = uid;
  delete from public.stories where user_id = uid;
  delete from public.offers where user_id = uid;
  delete from public.digest_subscriptions where user_id = uid;
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;

  -- Append-only audit log
  insert into public.dpdp_events (user_id, event, metadata)
  values (uid, 'erasure_completed', jsonb_build_object('completed_at', now()));

  -- Final user account deletion is performed via auth.admin from the server
  -- after this function returns successfully.
end;
$$;
revoke all on function public.request_user_erasure(uuid) from public, anon, authenticated;
grant execute on function public.request_user_erasure(uuid) to service_role;


-- -----------------------------------------------------------------------------
-- 4. TABLES + INDEXES
-- -----------------------------------------------------------------------------

-- COMPANIES (the 18 approved product companies)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  careers_url text not null,
  logo_url text,
  hubs text[] not null default '{}',
  crawler_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_slug on public.companies(slug);


-- JOBS (populated only by the daily crawler — never seeded)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  external_id text,
  signature text not null,
  title text not null,
  description text,
  apply_url text,
  location text,
  hubs text[] not null default '{}',
  remote boolean not null default false,
  min_experience_years numeric,
  max_experience_years numeric,
  comp_lpa_min numeric,
  comp_lpa_max numeric,
  tech_stack text[] not null default '{}',
  seniority seniority_level,
  posted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  freshness_score numeric not null default 100,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Primary dedup keys (idempotent upsert).
--
-- The (company_id, external_id) key is a CONSTRAINT (not just an index) so
-- PostgREST's `upsert(..., onConflict: "company_id,external_id")` can use
-- it. A partial unique index `where external_id is not null` would NOT work
-- with ON CONFLICT (Postgres requires the conflict target to match the
-- constraint/index fully, and PostgREST can't pass an additional WHERE).
-- NULL semantics in unique constraints permit multiple NULL external_id
-- rows per company — that's fine; our normalizer never produces NULL.
do $$ begin
  -- Drop the legacy partial index if it lingers from older schema runs.
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'ux_jobs_company_external'
      and indexdef ilike '%where%external_id is not null%'
  ) then
    execute 'drop index public.ux_jobs_company_external';
  end if;
exception when undefined_table then null; end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ux_jobs_company_external'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint ux_jobs_company_external unique (company_id, external_id);
  end if;
exception when undefined_table then null; end $$;

create unique index if not exists ux_jobs_company_signature on public.jobs(company_id, signature);

-- Search & filter indexes
create index if not exists idx_jobs_active_freshness on public.jobs(is_active, freshness_score desc) where is_active = true;
create index if not exists idx_jobs_company on public.jobs(company_id);
create index if not exists idx_jobs_hubs on public.jobs using gin(hubs);
create index if not exists idx_jobs_tech_stack on public.jobs using gin(tech_stack);
create index if not exists idx_jobs_title_trgm on public.jobs using gin(title gin_trgm_ops);


-- PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  display_name           text,
  job_title              text,
  "current_role"         text,           -- quoted: current_role is a reserved PG keyword
  current_company        text,
  years_experience       numeric,
  current_lpa            numeric,
  target_lpa             numeric,
  preferred_hubs         text[] not null default '{}',
  tech_stack             text[] not null default '{}',
  seniority              seniority_level,
  resume_storage_path    text,
  resume_parsed          jsonb,
  product_dna_score      integer,
  coach_plan             jsonb,
  coach_plan_at          timestamptz,
  role_function          text,           -- Phase F: canonical engineering function
  target_role_functions  text[] not null default '{}',  -- Phase F: what they're targeting
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Idempotent ALTER TABLEs for databases created before each migration phase.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is a no-op if the column already exists.

-- Phase E: coach plan columns (also in CREATE TABLE above for fresh installs)
alter table public.profiles add column if not exists coach_plan    jsonb;
alter table public.profiles add column if not exists coach_plan_at timestamptz;

-- Phase E: current_role — must be double-quoted because it is a reserved PG keyword
alter table public.profiles add column if not exists "current_role" text;

-- Phase F: role-function aware matching
alter table public.profiles add column if not exists role_function         text;
alter table public.profiles add column if not exists target_role_functions text[] not null default '{}';

-- Phase F: jobs role classification (used by backfill API + crawler)
alter table public.jobs add column if not exists role_function text;

create index if not exists idx_profiles_role_function on public.profiles(role_function);
create index if not exists idx_jobs_role_function     on public.jobs(role_function);
create index if not exists idx_profiles_seniority     on public.profiles(seniority);


-- ─────────────────────────────────────────────────────────────────────────────
-- Phase G: Structured JD parse + Fit Card + Resume Score
-- All idempotent. Run once per environment; re-running is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

-- jobs: structured JD facts written by the Gemini JD parser at ingest time.
-- These are what scoring + Fit Card actually read. The bag-of-tech `tech_stack`
-- column stays for backwards-compat / search but is no longer the source of truth.
alter table public.jobs add column if not exists must_have_skills    text[] not null default '{}';
alter table public.jobs add column if not exists nice_to_have_skills text[] not null default '{}';
alter table public.jobs add column if not exists jd_min_years        numeric;
alter table public.jobs add column if not exists jd_max_years        numeric;
alter table public.jobs add column if not exists work_mode           text;          -- 'onsite' | 'hybrid' | 'remote' | null
alter table public.jobs add column if not exists jd_seniority_signal seniority_level;
alter table public.jobs add column if not exists jd_summary          text;          -- ≤ 280 chars, what this role actually is
alter table public.jobs add column if not exists jd_parsed_at        timestamptz;

-- Ghost-job detection: cheap heuristic + Gemini boilerplate hint.
alter table public.jobs add column if not exists is_likely_ghost boolean not null default false;
alter table public.jobs add column if not exists ghost_signals  jsonb   not null default '{}'::jsonb;

create index if not exists idx_jobs_must_have    on public.jobs using gin(must_have_skills);
create index if not exists idx_jobs_nice_to_have on public.jobs using gin(nice_to_have_skills);
create index if not exists idx_jobs_unparsed     on public.jobs(jd_parsed_at) where jd_parsed_at is null;
create index if not exists idx_jobs_ghost        on public.jobs(is_likely_ghost) where is_likely_ghost = true;

-- matches: replace flat strengths/gaps/reasoning with the structured Fit Card.
-- Old columns are kept (nullable) for backwards-compat during migration; the UI
-- reads fit_card first and falls back. Stop writing to them after rollout.
alter table public.matches add column if not exists verdict        text;            -- strong_fit | stretch | underqualified | mismatch | off_target
alter table public.matches add column if not exists fit_card       jsonb;           -- the entire structured card; see lib/matching/fit-card.ts
alter table public.matches add column if not exists fit_card_at    timestamptz;
alter table public.matches add column if not exists hidden_reason  text;            -- when set: row is filtered out of default list ('mismatch' | 'ghost')

create index if not exists idx_matches_user_verdict on public.matches(user_id, verdict);

-- profiles: standalone resume strength score (Rezi-style 0-100 grounded in
-- live demand from the 18 approved companies, not generic ATS rules).
alter table public.profiles add column if not exists resume_score           integer;       -- 0–100
alter table public.profiles add column if not exists resume_score_breakdown jsonb;         -- per-dimension {label, score, weight}
alter table public.profiles add column if not exists resume_tips            jsonb;         -- ranked list of {tip, why}
alter table public.profiles add column if not exists resume_score_at        timestamptz;

-- Non-blocking resume upload: the PDF is saved + this timestamp is set
-- synchronously, but the heavy Gemini parse runs in next/server `after()`.
-- Client polls until parsing_at clears + resume_parsed is populated (or
-- parse_error is filled on failure). Prevents browser-side cold-start
-- timeouts that surfaced as "unexpected response from server".
alter table public.profiles add column if not exists resume_parsing_at  timestamptz;
alter table public.profiles add column if not exists resume_parse_error text;
alter table public.profiles add column if not exists active_resume_version_id    uuid;
alter table public.profiles add column if not exists pending_resume_version_id   uuid;
alter table public.profiles add column if not exists resume_parsed_version_id    uuid;
alter table public.profiles add column if not exists resume_embedding_version_id uuid;


-- ─────────────────────────────────────────────────────────────────────────────
-- Phase I: Semantic JD↔Resume alignment (Gemini text-embedding-004, 768-dim)
-- ─────────────────────────────────────────────────────────────────────────────
-- Stored as float8[] for portability — no pgvector extension required.
-- Cosine is computed in the engine at match time, not in SQL.
alter table public.jobs     add column if not exists embedding         float8[];
alter table public.jobs     add column if not exists embedding_at      timestamptz;
alter table public.profiles add column if not exists resume_embedding  float8[];
alter table public.profiles add column if not exists resume_embedding_at timestamptz;

create index if not exists idx_jobs_no_embedding
  on public.jobs (embedding_at) where embedding_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- Phase K: Enterprise-grade matching — auto-recompute, freshness, incremental.
-- ─────────────────────────────────────────────────────────────────────────────
-- seen_at: NULL when match row was created/updated since the user's last
-- visit; set on first read. Powers the "New" pill + ?show=new filter.
-- last_match_compute_at: when did the engine last run for this profile?
-- Used by incremental compute (skip jobs whose embedding_at < this) and
-- by the dashboard "you last checked N days ago" banner.
alter table public.matches  add column if not exists seen_at                timestamptz;
alter table public.profiles add column if not exists last_match_compute_at  timestamptz;
alter table public.profiles add column if not exists matches_resume_version_id uuid;

-- Partial index — most matches are seen; only unseen rows hit "show=new".
create index if not exists idx_matches_user_unseen
  on public.matches(user_id) where seen_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- Phase J: Inline JD parse during crawl — richer extracted facts.
-- ─────────────────────────────────────────────────────────────────────────────
-- role_function_jd: extracted from JD body, not the title (more reliable).
-- responsibilities: top 3-5 bullets, used by Fit Card and matcher.
-- qualifications_required / qualifications_preferred: credentials separated
--   from skills (degrees, years-in-tech, certifications).
-- tech_stack_explicit: tech named verbatim in the JD body.
-- team_context: one sentence on the team, if mentioned.
alter table public.jobs add column if not exists role_function_jd          text;
alter table public.jobs add column if not exists responsibilities          text[];
alter table public.jobs add column if not exists qualifications_required   text[];
alter table public.jobs add column if not exists qualifications_preferred  text[];
alter table public.jobs add column if not exists tech_stack_explicit       text[];
alter table public.jobs add column if not exists team_context              text;


-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 1: Trust & explainability columns
-- ─────────────────────────────────────────────────────────────────────────────
-- profiles.dna_breakdown:
--   jsonb { product_co_tenure, scale_impact, modern_stack, ownership } each
--   { score: int, weight: int, hint: text }. Computed deterministically from
--   parsed_resume — no LLM call. Surfaces in dashboard + profile to replace
--   the opaque single integer product_dna_score.
-- profiles.resume_signature:
--   SHA256 of resume_text. Lets us cache Fit Cards by (resume_sig × jd_sig)
--   instead of timestamps — true content-based determinism.
alter table public.profiles add column if not exists dna_breakdown    jsonb;
alter table public.profiles add column if not exists resume_signature text;

-- matches.score_breakdown:
--   jsonb { semantic, tech, role, experience, seniority, hub, lpa } as integers.
--   Powers the "Why this score?" surface on each match card — turns the
--   opaque 0-100 into the same 7 dimensions the matching engine actually
--   computed.
-- matches.user_hidden:
--   true when the user explicitly dismissed this role. The engine excludes
--   hidden rows from default views and skips Fit-Card regen for them.
-- matches.hidden_at:
--   when the dismiss happened, for the "Restore hidden" undo affordance.
-- matches.fit_card_resume_signature / fit_card_jd_signature:
--   the content-hashes that produced the cached fit_card. Item 6 — Gemini is
--   skipped entirely when both signatures match the current resume + JD.
alter table public.matches add column if not exists score_breakdown            jsonb;
alter table public.matches add column if not exists user_hidden                boolean not null default false;
alter table public.matches add column if not exists hidden_at                  timestamptz;
alter table public.matches add column if not exists fit_card_resume_signature  text;
alter table public.matches add column if not exists fit_card_jd_signature      text;

-- Partial index — most rows are visible; only hidden ones are queried for
-- the "Hidden" tab + "Restore" affordance.
create index if not exists idx_matches_user_hidden
  on public.matches(user_id) where user_hidden = true;

-- Durable background job state for resume parsing and match computation.
-- Actual execution can move from next/server after() to a queue later without
-- changing the user-visible state model.
create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (job_type in ('resume_parse', 'match_compute')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'superseded')),
  resume_version_id uuid,
  source text,
  idempotency_key text,
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_background_jobs_user_type_created
  on public.background_jobs(user_id, job_type, created_at desc);

create index if not exists idx_background_jobs_active
  on public.background_jobs(user_id, job_type, status)
  where status in ('queued', 'running');

create index if not exists idx_background_jobs_queue_drain
  on public.background_jobs(job_type, status, queued_at)
  where status = 'queued';

create index if not exists idx_background_jobs_dead_letter
  on public.background_jobs(user_id, job_type, finished_at desc)
  where status = 'failed';

create unique index if not exists uniq_background_jobs_active_resume_parse
  on public.background_jobs(user_id, job_type)
  where job_type = 'resume_parse' and status in ('queued', 'running');

create unique index if not exists uniq_background_jobs_active_match_compute
  on public.background_jobs(user_id, job_type, resume_version_id)
  where job_type = 'match_compute' and status in ('queued', 'running');

create unique index if not exists uniq_background_jobs_active_idempotency
  on public.background_jobs(idempotency_key)
  where idempotency_key is not null and status in ('queued', 'running');

-- Backfill existing parsed resumes with a durable active version so Phase 1
-- readiness checks do not strand existing users.
with versioned_profiles as (
  select
    id,
    coalesce(active_resume_version_id, gen_random_uuid()) as version_id
  from public.profiles
  where resume_storage_path is not null
    and resume_parsed is not null
    and active_resume_version_id is null
)
update public.profiles p
set
  active_resume_version_id = v.version_id,
  resume_parsed_version_id = coalesce(p.resume_parsed_version_id, v.version_id),
  resume_embedding_version_id = case
    when p.resume_embedding_at is not null then coalesce(p.resume_embedding_version_id, v.version_id)
    else p.resume_embedding_version_id
  end,
  matches_resume_version_id = case
    when p.last_match_compute_at is not null then coalesce(p.matches_resume_version_id, v.version_id)
    else p.matches_resume_version_id
  end
from versioned_profiles v
where p.id = v.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 4: cron lock table — prevents overlapping recompute runs
-- ─────────────────────────────────────────────────────────────────────────────
-- A single row per named lock. `holder_id` + `expires_at` form a lease — if
-- a holder dies without releasing, the lock auto-expires and the next
-- caller can grab it. Used by `acquire_cron_lock(name, ttl_seconds)` below.
create table if not exists public.cron_locks (
  name        text primary key,
  holder_id   uuid not null,
  acquired_at timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Atomic lease acquire. Returns the holder_id on success, NULL when another
-- caller currently holds an un-expired lease.
create or replace function public.acquire_cron_lock(
  lock_name text,
  ttl_seconds integer default 600
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_holder uuid := gen_random_uuid();
  inserted_holder uuid;
begin
  insert into public.cron_locks (name, holder_id, expires_at)
  values (lock_name, new_holder, now() + (ttl_seconds || ' seconds')::interval)
  on conflict (name) do update
    set holder_id   = excluded.holder_id,
        acquired_at = excluded.acquired_at,
        expires_at  = excluded.expires_at
    where public.cron_locks.expires_at < now()
  returning holder_id into inserted_holder;

  return inserted_holder;
end;
$$;
revoke all on function public.acquire_cron_lock(text, integer) from public;
grant execute on function public.acquire_cron_lock(text, integer) to service_role;

create or replace function public.release_cron_lock(lock_name text, expected_holder uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_deleted integer;
begin
  delete from public.cron_locks
    where name = lock_name and holder_id = expected_holder;
  get diagnostics rows_deleted = row_count;
  return rows_deleted > 0;
end;
$$;
revoke all on function public.release_cron_lock(text, uuid) from public;
grant execute on function public.release_cron_lock(text, uuid) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 2: apply-click intent signal + resume version history
-- ─────────────────────────────────────────────────────────────────────────────
-- jobs.apply_click_count:
--   Internal click counter — incremented when a user clicks "Apply on official
--   site" from a match card or job detail page. Drives admin analytics,
--   ranking tie-break candidates, and the "popular roles" surface on insights.
alter table public.jobs add column if not exists apply_click_count integer not null default 0;

-- Drop dead column `applicants_count` — no code path ever populated it
-- (career sites we crawl don't expose an applicant count). Idempotent.
alter table public.jobs drop column if exists applicants_count;
create index if not exists idx_jobs_apply_clicks
  on public.jobs(apply_click_count desc) where is_active = true;

-- Atomic increment helper. Avoids the read-modify-write race when many users
-- click "Apply" on the same hot role in the same second.
create or replace function public.increment_apply_click_count(job_uuid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.jobs set apply_click_count = apply_click_count + 1 where id = job_uuid;
$$;
revoke all on function public.increment_apply_click_count(uuid) from public;
grant execute on function public.increment_apply_click_count(uuid) to authenticated, service_role;


-- RESUME VERSIONS (snapshot before overwrite — DPDP-compliant; user-owned)
-- Item 8 (Sprint 2). When a user re-uploads / re-parses their resume we
-- snapshot the prior parsed JSON + storage path here so they can revert.
-- Soft-cap to last 5 snapshots per user (enforced in the server action,
-- not via constraint — easier to evolve the retention policy).
create table if not exists public.resume_versions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  resume_parsed   jsonb not null,
  resume_storage_path text,
  product_dna_score   integer,
  dna_breakdown   jsonb,
  resume_signature text,
  source          text not null default 'overwrite',  -- 'overwrite' | 'manual_revert' | 'json_import' | 'editor'
  created_at      timestamptz not null default now()
);

-- JSON Resume v1.0.0 canonical copy (jsonresume.org schema). Optional column
-- added in the Reactive-Resume-inspired interop layer. When present, this is
-- the authoritative source for the editor + multi-template render; otherwise
-- the mapper derives one from resume_parsed on the fly.
alter table public.resume_versions
  add column if not exists resume_json jsonb;

create index if not exists idx_resume_versions_user
  on public.resume_versions(user_id, created_at desc);

-- RLS — only the owning user can read their own snapshots.
alter table public.resume_versions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'resume_versions'
      and policyname = 'resume_versions_select_own'
  ) then
    create policy resume_versions_select_own on public.resume_versions
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Service-role insert/delete only (server actions go through admin client).


-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 5: Apply Toolkit — tailored resumes + negotiation memos
-- ─────────────────────────────────────────────────────────────────────────────
-- Both tables follow the same pattern: one row per (user_id, job_id) so we
-- can cache the artifact and avoid re-running Gemini for the same pair. The
-- "regenerate" button on the UI updates the row in place (upsert). When the
-- candidate's resume_signature or the job's signature changes the cached
-- row is invalidated lazily (the generation action checks signatures and
-- regenerates when they differ).

create table if not exists public.tailored_resumes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  job_id              uuid not null references public.jobs(id) on delete cascade,
  -- Structured content the LLM produced (sections + bullets) — used to
  -- regenerate the .docx if storage was nuked, and to show an HTML preview.
  content             jsonb not null,
  -- Path inside the `tailored-resumes` private storage bucket.
  docx_storage_path   text,
  resume_signature    text,
  job_signature       text,
  generated_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists idx_tailored_resumes_user
  on public.tailored_resumes(user_id, generated_at desc);

alter table public.tailored_resumes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tailored_resumes'
      and policyname = 'tailored_resumes_select_own'
  ) then
    create policy tailored_resumes_select_own on public.tailored_resumes
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists tg_tailored_resumes_updated_at on public.tailored_resumes;
create trigger tg_tailored_resumes_updated_at
  before update on public.tailored_resumes
  for each row execute function public.tg_set_updated_at();


create table if not exists public.negotiation_memos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  job_id            uuid not null references public.jobs(id) on delete cascade,
  content           jsonb not null,
  -- The market bracket the memo was anchored on (snapshot at generation time)
  market_comp       jsonb,
  resume_signature  text,
  job_signature     text,
  candidate_target_lpa  numeric,
  candidate_current_lpa numeric,
  generated_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists idx_negotiation_memos_user
  on public.negotiation_memos(user_id, generated_at desc);

alter table public.negotiation_memos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'negotiation_memos'
      and policyname = 'negotiation_memos_select_own'
  ) then
    create policy negotiation_memos_select_own on public.negotiation_memos
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists tg_negotiation_memos_updated_at on public.negotiation_memos;
create trigger tg_negotiation_memos_updated_at
  before update on public.negotiation_memos
  for each row execute function public.tg_set_updated_at();


-- Storage bucket for generated .docx files. Private — only the owning
-- user can download (via signed URL minted by the server).
do $$ begin
  insert into storage.buckets (id, name, public)
  values ('tailored-resumes', 'tailored-resumes', false)
  on conflict (id) do nothing;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'tailored_resumes_owner_read'
  ) then
    create policy tailored_resumes_owner_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'tailored-resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;


-- CONSENTS (DPDP — granular, versioned, append-style with revoked_at)
create table if not exists public.consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose consent_purpose not null,
  policy_version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, purpose, policy_version)
);

create index if not exists idx_consents_user on public.consents(user_id);


-- MATCHES (cached scores per user × job)
create table if not exists public.matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  score numeric not null,
  strengths jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  reasoning text,
  computed_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists idx_matches_user_score on public.matches(user_id, score desc);


-- APPLICATIONS (tracker)
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status application_status not null default 'saved',
  applied_at timestamptz,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists idx_applications_user_status on public.applications(user_id, status);


-- INTERVIEW NOTES
create table if not exists public.interview_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  round text,
  interviewer text,
  notes text,
  rating smallint,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_notes_application on public.interview_notes(application_id);


-- STAR STORIES BANK
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  situation text,
  task text,
  action text,
  result text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stories_user on public.stories(user_id);
create index if not exists idx_stories_tags on public.stories using gin(tags);


-- OFFERS (compare)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_name_snapshot text,
  base_lpa numeric,
  variable_lpa numeric,
  esop_value_lpa numeric,
  joining_bonus numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offers_user on public.offers(user_id);


-- DIGEST SUBSCRIPTIONS
create table if not exists public.digest_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency digest_frequency not null default 'weekly',
  last_sent_at timestamptz,
  next_send_at timestamptz,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- CRAWL RUNS (audit)
create table if not exists public.crawl_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status crawl_status not null default 'running',
  jobs_seen integer not null default 0,
  jobs_new integer not null default 0,
  jobs_updated integer not null default 0,
  jobs_marked_stale integer not null default 0,
  error text
);

create index if not exists idx_crawl_runs_company on public.crawl_runs(company_id, started_at desc);


-- DPDP EVENTS (append-only audit)
create table if not exists public.dpdp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event dpdp_event_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dpdp_events_user on public.dpdp_events(user_id, created_at desc);


-- LLM DEAD-KEY STATE (persists across Vercel cold starts)
-- ----------------------------------------------------------------------------
-- The OpenAI-compatible provider router in packages/shared/src/llm tracks
-- dead (provider × model × key × capability) combos in-memory to skip them
-- in O(1) on subsequent calls. Vercel serverless containers reset this map
-- on every cold start, which causes wasted 429 round-trips. This table
-- persists the dead-state so cold starts hydrate from it.
--
-- Service-role only — no user data, no PII. Reason column is truncated to
-- 500 chars and the writer in apps/web strips any resume / key references
-- before insert.
create table if not exists public.llm_dead_keys (
  combo_key    text primary key,                  -- "providerId|capability|model|keyIndex"
  provider_id  text not null,
  model        text not null,
  key_index    integer not null,
  capability   text not null,                     -- 'text_json' | 'pdf_json' | 'embedding'
  failure_kind text not null,                     -- 'auth' | 'quota' | 'rate_limited' | 'unsupported'
  dead_until   timestamptz not null,
  detected_at  timestamptz not null default now(),
  reason       text
);

create index if not exists idx_llm_dead_keys_dead_until
  on public.llm_dead_keys(dead_until);

alter table public.llm_dead_keys enable row level security;
-- Intentionally no public policies — service-role only.


-- -----------------------------------------------------------------------------
-- 5. updated_at TRIGGERS  (drop-then-create for idempotency)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'companies', 'jobs', 'profiles',
    'applications', 'stories', 'offers',
    'digest_subscriptions', 'background_jobs'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists %I on public.%I;', 'trg_' || t || '_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.tg_set_updated_at();',
      'trg_' || t || '_updated_at', t
    );
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 6. RLS ENABLE + POLICIES  (drop-then-create for idempotency)
-- -----------------------------------------------------------------------------

-- Enable RLS everywhere
alter table public.companies              enable row level security;
alter table public.jobs                   enable row level security;
alter table public.profiles               enable row level security;
alter table public.consents               enable row level security;
alter table public.matches                enable row level security;
alter table public.applications           enable row level security;
alter table public.interview_notes        enable row level security;
alter table public.stories                enable row level security;
alter table public.offers                 enable row level security;
alter table public.digest_subscriptions   enable row level security;
alter table public.crawl_runs             enable row level security;
alter table public.dpdp_events            enable row level security;
alter table public.background_jobs        enable row level security;

-- companies: public read for authenticated users; writes via service role only
drop policy if exists "companies_read_authed" on public.companies;
create policy "companies_read_authed"
  on public.companies for select
  to authenticated
  using (true);

-- jobs: public read for authenticated users; writes via service role only
drop policy if exists "jobs_read_authed" on public.jobs;
create policy "jobs_read_authed"
  on public.jobs for select
  to authenticated
  using (true);

-- profiles: only the user themselves (id = auth.uid())
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select
  to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
  to authenticated with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete
  to authenticated using (id = (select auth.uid()));

-- Generic helper: per-user-owned table policies (consents, matches, applications, stories, offers, digest_subscriptions)
do $$
declare
  t text;
  user_owned text[] := array[
    'consents', 'matches', 'applications',
    'stories', 'offers', 'digest_subscriptions'
  ];
begin
  foreach t in array user_owned loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select
        to authenticated using (user_id = (select auth.uid()));',
      t || '_select_own', t
    );
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert
        to authenticated with check (user_id = (select auth.uid()));',
      t || '_insert_own', t
    );
    execute format('drop policy if exists %I on public.%I;', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update
        to authenticated using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()));',
      t || '_update_own', t
    );
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete
        to authenticated using (user_id = (select auth.uid()));',
      t || '_delete_own', t
    );
  end loop;
end $$;

drop policy if exists "background_jobs_select_own" on public.background_jobs;
create policy "background_jobs_select_own" on public.background_jobs for select
  to authenticated using (user_id = (select auth.uid()));

grant select on public.background_jobs to authenticated;
grant all on public.background_jobs to service_role;

-- interview_notes: scoped via parent application
drop policy if exists "interview_notes_select_own" on public.interview_notes;
create policy "interview_notes_select_own" on public.interview_notes for select
  to authenticated using (
    exists (
      select 1 from public.applications a
      where a.id = interview_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "interview_notes_insert_own" on public.interview_notes;
create policy "interview_notes_insert_own" on public.interview_notes for insert
  to authenticated with check (
    exists (
      select 1 from public.applications a
      where a.id = interview_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "interview_notes_update_own" on public.interview_notes;
create policy "interview_notes_update_own" on public.interview_notes for update
  to authenticated using (
    exists (
      select 1 from public.applications a
      where a.id = interview_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "interview_notes_delete_own" on public.interview_notes;
create policy "interview_notes_delete_own" on public.interview_notes for delete
  to authenticated using (
    exists (
      select 1 from public.applications a
      where a.id = interview_notes.application_id
        and a.user_id = (select auth.uid())
    )
  );

-- dpdp_events: user can read their own audit log; only service role writes
drop policy if exists "dpdp_events_select_own" on public.dpdp_events;
create policy "dpdp_events_select_own" on public.dpdp_events for select
  to authenticated using (user_id = (select auth.uid()));

-- crawl_runs: service role only (no public policies)


-- -----------------------------------------------------------------------------
-- 7. STORAGE BUCKET + POLICIES (resumes, private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner-only access. Path convention: {auth.uid()}/{filename}
drop policy if exists "resumes_owner_select" on storage.objects;
create policy "resumes_owner_select" on storage.objects for select
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resumes_owner_insert" on storage.objects;
create policy "resumes_owner_insert" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resumes_owner_update" on storage.objects;
create policy "resumes_owner_update" on storage.objects for update
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "resumes_owner_delete" on storage.objects;
create policy "resumes_owner_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 6: Quality gate + hard caps + confidence + feedback re-rank
-- ─────────────────────────────────────────────────────────────────────────────
-- Three independent improvements, one section because they share defaults
-- and never break existing reads (every column has a default; engine code
-- reads them defensively).
--
--   (1) Quality gate — every job gets a quality_score (0–100) at ingest.
--       Crawler refuses to parse anything <40 (saves Gemini tokens) and the
--       matching engine filters anything <40 from the user feed. Reasons are
--       persisted as a text[] so QA can audit why a job was gated.
--
--   (2) Confidence + hard caps — matches now carry a `confidence` (0–100)
--       independent of `score` and a `hard_cap_reason` documenting whether
--       the score was capped (e.g., thin posting, no stack overlap). UI can
--       show "78 (confidence 40)" differently from "78 (confidence 90)".
--
--   (3) Feedback adjustment — derived at compute time from user's prior
--       dismissals + applications. Stored on the match row so the UI can
--       surface "boosted/lowered because…" without re-deriving.

-- (1) Quality gate columns on jobs.
alter table public.jobs add column if not exists quality_score numeric not null default 100;
alter table public.jobs add column if not exists quality_reasons text[] not null default '{}';
alter table public.jobs add column if not exists quality_gated_at timestamptz;

-- Partial index: cheap filter for the common "exclude low-quality" predicate.
create index if not exists idx_jobs_quality_high
  on public.jobs (quality_score desc)
  where is_active = true and quality_score >= 40;

-- (2) Match-level explainability columns.
alter table public.matches add column if not exists confidence numeric;
alter table public.matches add column if not exists hard_cap_reason text;
alter table public.matches add column if not exists tech_coverage jsonb;

-- (3) Feedback re-rank delta.
alter table public.matches add column if not exists feedback_adjustment numeric not null default 0;

-- Doc comments — these survive replication and show up in psql \d+.
comment on column public.jobs.quality_score        is 'Ingest-time quality score (0-100). Jobs <40 are hidden from match feed.';
comment on column public.jobs.quality_reasons      is 'Reason codes contributing to quality_score, e.g. {thin_description, stale_posting}.';
comment on column public.jobs.quality_gated_at     is 'When quality was last evaluated. NULL = never gated (legacy row).';
comment on column public.matches.confidence        is 'How confident the matcher is in this score, 0-100. Independent of score itself.';
comment on column public.matches.hard_cap_reason   is 'When set, score was capped below the raw rubric total. One of: thin_jd | no_stack | senior_no_exp | wrong_field.';
comment on column public.matches.tech_coverage     is 'JSON breakdown {direct:[], adjacent:[], missing:[]} of must-have tech vs candidate stack.';
comment on column public.matches.feedback_adjustment is 'Per-user re-rank delta from prior dismissals/applies. Clamped [-18, 18].';


-- ─────────────────────────────────────────────────────────────────────────────
-- Phase R1 — Resume Intelligence (USP): enhanced + tailored review flow
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds:
--   • `resume_intelligence` value to consent_purpose enum
--   • `enhanced_resumes` table (per-user general resume enhancement)
--   • `enhanced-resumes` private storage bucket + owner-only read policy
--   • Augments `tailored_resumes` with diagnosis/rewrites/decisions/pdf/status
--   • `resume_intel_events` audit + cost telemetry table
-- Authenticity rule: every rewrite is derivable from the source resume. We
-- never store the user's bullet text in the audit table — only structural
-- counts and severities.

-- (1) Extend consent_purpose with a granular per-purpose toggle.
alter type consent_purpose add value if not exists 'resume_intelligence';

-- (2) enhanced_resumes — one per (user, source_resume_signature, status).
--     A user can have at most one 'pending_review' row per resume signature;
--     finalised + discarded rows accumulate as history.
create table if not exists public.enhanced_resumes (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,

  -- Snapshot of inputs at generation time
  source_resume_signature  text not null,
  target_role_function     text,
  market_keywords          text[] not null default '{}',

  -- LLM outputs (Step 1 + Step 2 of the pipeline)
  diagnosis                jsonb not null,
  rewrites                 jsonb not null default '{}'::jsonb,
  ats_before               jsonb not null,
  ats_after                jsonb,

  -- User decisions per bullet (Map<bullet_id, "kept" | "edited" | accepted_alt_id>)
  decisions                jsonb not null default '{}'::jsonb,

  -- Finalised content + rendered artifacts
  enhanced_content         jsonb,
  docx_storage_path        text,
  pdf_storage_path         text,

  status                   text not null default 'pending_review',
  -- 'pending_review' | 'finalised' | 'discarded'

  generated_at             timestamptz not null default now(),
  finalised_at             timestamptz,
  updated_at               timestamptz not null default now(),

  constraint enhanced_resumes_status_chk
    check (status in ('pending_review','finalised','discarded'))
);

-- Only one pending row per (user, signature) — prevents review screens
-- racing each other. Old pending rows are auto-discarded when a new
-- diagnosis is requested (see enhance-actions.ts).
create unique index if not exists uniq_enhanced_resumes_pending
  on public.enhanced_resumes(user_id, source_resume_signature)
  where status = 'pending_review';

create index if not exists idx_enhanced_resumes_user
  on public.enhanced_resumes(user_id, generated_at desc);

alter table public.enhanced_resumes enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enhanced_resumes'
      and policyname = 'enhanced_resumes_select_own'
  ) then
    create policy enhanced_resumes_select_own on public.enhanced_resumes
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists tg_enhanced_resumes_updated_at on public.enhanced_resumes;
create trigger tg_enhanced_resumes_updated_at
  before update on public.enhanced_resumes
  for each row execute function public.tg_set_updated_at();

-- (3) Private storage bucket for enhanced resume artifacts (docx + pdf).
do $$ begin
  insert into storage.buckets (id, name, public)
  values ('enhanced-resumes', 'enhanced-resumes', false)
  on conflict (id) do nothing;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'enhanced_resumes_owner_read'
  ) then
    create policy enhanced_resumes_owner_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'enhanced-resumes'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- (4) Augment tailored_resumes with the diff-review workflow columns.
--     Existing rows keep working: status defaults to 'finalised' so they
--     skip the review screen and behave like the pre-R1 flow.
alter table public.tailored_resumes
  add column if not exists diagnosis         jsonb,
  add column if not exists rewrites          jsonb default '{}'::jsonb,
  add column if not exists decisions         jsonb default '{}'::jsonb,
  add column if not exists pdf_storage_path  text,
  add column if not exists mode              text default 'polish',
  add column if not exists status            text not null default 'finalised';

-- Belt-and-suspenders constraint check (idempotent attempt).
do $$ begin
  alter table public.tailored_resumes
    add constraint tailored_resumes_status_chk
    check (status in ('pending_review','finalised','discarded'));
exception when duplicate_object then null;
         when others then null;
end $$;

do $$ begin
  alter table public.tailored_resumes
    add constraint tailored_resumes_mode_chk
    check (mode in ('polish','tailor'));
exception when duplicate_object then null;
         when others then null;
end $$;

-- (5) Audit + cost telemetry. Records only structural facts about runs.
--     Resume bullet text is NEVER written here — DPDP discipline.
create table if not exists public.resume_intel_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,
  -- 'diagnosis' | 'rewrite_batch' | 'render_docx' | 'render_pdf' | 'finalise' | 'discard'
  scope         text not null,
  -- 'enhanced' | 'tailored'
  scope_ref_id  uuid,

  llm_tier      text,
  cost_tokens_in   integer,
  cost_tokens_out  integer,
  latency_ms       integer,

  ok            boolean not null,
  error_kind    text,

  created_at    timestamptz not null default now()
);

create index if not exists idx_resume_intel_events_user
  on public.resume_intel_events(user_id, created_at desc);

create index if not exists idx_resume_intel_events_scope
  on public.resume_intel_events(user_id, scope, created_at desc);

alter table public.resume_intel_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'resume_intel_events'
      and policyname = 'resume_intel_events_select_own'
  ) then
    create policy resume_intel_events_select_own on public.resume_intel_events
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- (6) Update request_user_erasure() to clean up the new tables.
--     The cascade chain already deletes enhanced_resumes + tailored extra
--     columns via auth.users → profiles → ... but we explicitly delete
--     them first so the dpdp_events row records the erasure in full.
create or replace function public.request_user_erasure_r1(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.resume_intel_events where user_id = uid;
  delete from public.enhanced_resumes    where user_id = uid;
  -- Existing erasure handles tailored_resumes via auth.users on-delete cascade
  insert into public.dpdp_events (user_id, event, metadata)
  values (uid, 'erasure_completed',
          jsonb_build_object('scope', 'resume_intelligence', 'completed_at', now()));
end;
$$;
revoke all on function public.request_user_erasure_r1(uuid) from public, anon, authenticated;
grant execute on function public.request_user_erasure_r1(uuid) to service_role;

comment on table public.enhanced_resumes is 'Per-user general resume enhancement runs. Pipeline: diagnosis → bullet rewrites → user decisions → render docx+pdf. Authenticity rule: rewrites must be derivable from the source resume.';
comment on table public.resume_intel_events is 'Audit + cost telemetry for the resume intelligence pipeline. Stores structural facts only — never resume bullet text.';
comment on column public.tailored_resumes.mode is 'Tailoring mode: polish (default, minimal edits) or tailor (aggressive JD-aligned rewrites). Captured at diagnosis time.';
comment on column public.tailored_resumes.status is 'pending_review | finalised | discarded. Legacy rows default to finalised so existing single-shot flow continues to work.';


-- -----------------------------------------------------------------------------
-- 8. SEED — 18 approved product companies (no jobs)
-- -----------------------------------------------------------------------------
insert into public.companies (slug, name, careers_url, hubs) values
  ('google',     'Google',      'https://www.google.com/about/careers/applications/jobs/results?location=India',                          array['Bengaluru','Hyderabad','Gurugram','Pune']),
  ('microsoft',  'Microsoft',   'https://jobs.careers.microsoft.com/global/en/search?lc=India',                                            array['Bengaluru','Hyderabad','Noida','Gurugram','Pune']),
  ('meta',       'Meta',        'https://www.metacareers.com/jobs?offices[0]=Bengaluru%2C%20India&offices[1]=Hyderabad%2C%20India',         array['Bengaluru','Hyderabad','Gurugram']),
  ('amazon',     'Amazon',      'https://www.amazon.jobs/en/search?country%5B%5D=IND',                                                     array['Bengaluru','Hyderabad','Chennai','Gurugram']),
  ('apple',      'Apple',       'https://jobs.apple.com/en-in/search?location=india-INDC',                                                 array['Bengaluru','Hyderabad']),
  ('atlassian',  'Atlassian',   'https://www.atlassian.com/company/careers/all-jobs?team=Engineering&location=India',                      array['Bengaluru']),
  ('nvidia',     'NVIDIA',      'https://www.nvidia.com/en-in/about-nvidia/careers/',                                                      array['Bengaluru','Hyderabad','Pune']),
  ('oracle',     'Oracle',      'https://careers.oracle.com/jobs/#en/sites/jobsearch/locations/300000000287249',                           array['Bengaluru','Hyderabad','Noida']),
  ('salesforce', 'Salesforce',  'https://careers.salesforce.com/en/jobs/?country=India',                                                   array['Bengaluru','Hyderabad','Gurugram']),
  ('sap-labs',   'SAP Labs',    'https://jobs.sap.com/search/?q=&locationsearch=india',                                                    array['Bengaluru','Pune','Gurugram']),
  ('razorpay',   'Razorpay',    'https://razorpay.com/jobs/jobs-all/',                                                                      array['Bengaluru','Remote-India']),
  ('phonepe',    'PhonePe',     'https://www.phonepe.com/careers/job-openings/',                                                            array['Bengaluru']),
  ('zerodha',    'Zerodha',     'https://zerodha.com/careers/',                                                                             array['Bengaluru']),
  ('cred',       'CRED',        'https://careers.cred.club/',                                                                               array['Bengaluru']),
  ('groww',      'Groww',       'https://groww.in/careers',                                                                                 array['Bengaluru']),
  ('swiggy',     'Swiggy',      'https://careers.swiggy.com/',                                                                              array['Bengaluru','Gurugram']),
  ('zomato',     'Zomato',      'https://www.zomato.com/careers',                                                                           array['Gurugram','Bengaluru']),
  ('flipkart',   'Flipkart',    'https://www.flipkartcareers.com/',                                                                         array['Bengaluru'])
on conflict (slug) do update set
  name = excluded.name,
  careers_url = excluded.careers_url,
  hubs = excluded.hubs,
  updated_at = now();


-- =============================================================================
-- DONE. Verify in Supabase Studio:
--   • 18 rows in `companies`, 0 rows in `jobs`
--   • RLS enabled on every table above
--   • Storage bucket `resumes` exists and is private
-- =============================================================================
