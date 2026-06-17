-- =============================================================================
-- ProdMatch.ai — Consolidated Idempotent Schema
-- =============================================================================
-- Paste this entire file into the Supabase SQL editor and run.
-- Safe to re-run any number of times; will not create duplicates or errors.
--
-- To navigate this file in your editor, search for "=== SECTION:" — every
-- top-level section emits one banner that takes you straight to the block.
--
-- Sections (in file order):
--   === SECTION: EXTENSIONS               (1)
--   === SECTION: ENUMS                    (2)
--   === SECTION: HELPER FUNCTIONS         (3)
--   === SECTION: TABLES — CORE            (4a)  companies, jobs, profiles, ...
--   === SECTION: TABLES — RESUME          (4b)  resume_versions, exports, ...
--   === SECTION: TABLES — MATCHING        (4c)  matches, dna_breakdowns, ...
--   === SECTION: TABLES — CRAWLER         (4d)  crawl_runs, background_jobs, ...
--   === SECTION: TABLES — LLM OPS         (4e)  llm_dead_keys, ...
--   === SECTION: TABLES — INTERVIEW       (4f)  readiness, stories, dispatch, ...
--   === SECTION: TABLES — DSA             (4g)  dsa_user_progress
--   === SECTION: UPDATED_AT TRIGGERS      (5)
--   === SECTION: RLS POLICIES             (6)
--   === SECTION: STORAGE BUCKET           (7)
--   === SECTION: SEED DATA                (8)
--
-- All blocks use IF NOT EXISTS / DO $$ ... EXCEPTION WHEN duplicate_object
-- patterns so re-running this entire file in the Supabase SQL editor is
-- always safe.
-- =============================================================================


-- =============================================================================
-- === SECTION: EXTENSIONS ===
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
-- === SECTION: ENUMS ===
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
-- === SECTION: HELPER FUNCTIONS ===
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
-- === SECTION: TABLES ===
-- 4. TABLES + INDEXES (sub-sections grouped by domain — see file header)
-- -----------------------------------------------------------------------------

-- COMPANIES (the 51 approved product companies)
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
-- live demand from the 51 approved companies, not generic ATS rules).
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

-- Daily match recompute candidates.
-- Keeps eligibility in SQL so old invalid profiles cannot hide later valid
-- users from the cron batch. Ordered stale-first so repeated invocations drain
-- every consented active resume, not only recently uploaded resumes.
create or replace function public.match_recompute_candidates(
  batch_limit integer default 60,
  target_user_id uuid default null
)
returns table (
  id uuid,
  active_resume_version_id uuid,
  last_match_compute_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select
      p.id,
      p.active_resume_version_id,
      p.last_match_compute_at
    from public.profiles p
    where p.resume_storage_path is not null
      and p.resume_embedding_at is not null
      and p.pending_resume_version_id is null
      and p.resume_parse_error is null
      and p.active_resume_version_id is not null
      and p.resume_parsed_version_id = p.active_resume_version_id
      and p.resume_embedding_version_id = p.active_resume_version_id
      and (target_user_id is null or p.id = target_user_id)
      and exists (
        select 1
        from public.consents c
        where c.user_id = p.id
          and c.purpose = 'matching'::consent_purpose
          and c.granted = true
      )
  )
  select
    eligible.id,
    eligible.active_resume_version_id,
    eligible.last_match_compute_at,
    count(*) over() as total_count
  from eligible
  order by eligible.last_match_compute_at asc nulls first, eligible.id asc
  limit greatest(1, least(coalesce(batch_limit, 60), 500));
$$;

revoke all on function public.match_recompute_candidates(integer, uuid) from public;
grant execute on function public.match_recompute_candidates(integer, uuid) to service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- Security fix (S-1): distributed rate-limit counter shared across all
-- Vercel function instances. The in-memory Map in apps/web/lib/security
-- was bypassable by fanning requests out across lambda instances. This
-- table is the shared backend; `rate_limit_check` is an atomic UPSERT.
-- Sliding-window-fixed: we count per (key, window-start) where window-start
-- is computed by the caller as floor(now / windowMs). Stale rows are
-- garbage-collected by the cron reaper at the bottom of every recompute.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.rate_limit_counters (
  bucket_key   text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  expires_at   timestamptz not null,
  primary key (bucket_key, window_start)
);

create index if not exists idx_rate_limit_expires
  on public.rate_limit_counters(expires_at);

-- Atomic counter increment. Returns the post-increment value; caller compares
-- against limit. Safe under concurrent calls thanks to the ON CONFLICT + the
-- returning clause.
--
-- BUG FIX (2026-05-22): parameter names `bucket_key` and `window_start`
-- collide with the column names on `rate_limit_counters`, producing
-- ERROR 42702 "column reference ... is ambiguous". The `#variable_conflict
-- use_column` declaration tells PL/pgSQL to resolve bare identifiers to
-- column names; parameter references are then qualified explicitly via
-- `rate_limit_check.<param>`. Drop-then-recreate because Postgres rejects
-- changing a function's input parameter names with CREATE OR REPLACE.
drop function if exists public.rate_limit_check(text, timestamptz, integer);
create function public.rate_limit_check(
  bucket_key   text,
  window_start timestamptz,
  ttl_seconds  integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  current_count integer;
begin
  insert into public.rate_limit_counters (bucket_key, window_start, count, expires_at)
  values (rate_limit_check.bucket_key,
          rate_limit_check.window_start,
          1,
          rate_limit_check.window_start + (rate_limit_check.ttl_seconds || ' seconds')::interval)
  on conflict (bucket_key, window_start) do update
    set count = public.rate_limit_counters.count + 1
  returning rate_limit_counters.count into current_count;
  return current_count;
end;
$$;
revoke all on function public.rate_limit_check(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_check(text, timestamptz, integer) to service_role;

-- Best-effort GC. Called from /api/cron/recompute-matches.
create or replace function public.rate_limit_gc()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from public.rate_limit_counters where expires_at < now() - interval '1 hour';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
revoke all on function public.rate_limit_gc() from public, anon, authenticated;
grant execute on function public.rate_limit_gc() to service_role;


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
  extracted_resume    jsonb,
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

-- Launch-readiness telemetry (idempotent additions).
-- Lets the admin/health page answer "why did 2500 raw jobs become 800
-- in the catalog?" by recording every stage of the per-company funnel.
alter table public.crawl_runs add column if not exists jobs_after_normalize    integer not null default 0;
alter table public.crawl_runs add column if not exists jobs_quality_gated      integer not null default 0;
alter table public.crawl_runs add column if not exists jobs_rejected_non_eng   integer not null default 0;
alter table public.crawl_runs add column if not exists jobs_parse_ok           integer not null default 0;
alter table public.crawl_runs add column if not exists jobs_parse_err          integer not null default 0;
alter table public.crawl_runs add column if not exists jobs_parse_deferred     integer not null default 0;


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


-- ----------------------------------------------------------------------------
-- INTERVIEW LAB (Phase 1) — Story Bank + Readiness Mirror
-- ----------------------------------------------------------------------------
--
-- Two owner-scoped tables. Insert/update goes through the user's session
-- (NOT service-role) so RLS guarantees user_id = auth.uid().

do $$ begin
  create type interview_story_competency as enum (
    'leadership',
    'ownership',
    'conflict',
    'scope_change',
    'technical_depth',
    'business_impact',
    'failure_learning',
    'mentorship',
    'ambiguity',
    'cross_functional'
  );
exception when duplicate_object then null; end $$;

-- Story Bank
create table if not exists public.interview_stories (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  competency           interview_story_competency not null,
  title                text not null,
  situation            text not null,
  task                 text not null,
  action               text not null,
  result               text not null,
  source_company       text,
  source_role          text,
  suggested_questions  jsonb not null default '[]'::jsonb,
  is_starred           boolean not null default false,
  polished             boolean not null default false,
  /** Snapshot of profiles.resume_signature when this row was generated. Lets us
   *  invalidate auto-generated stories when the user uploads a new resume. */
  source_signature     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_interview_stories_user
  on public.interview_stories(user_id, created_at desc);

alter table public.interview_stories enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_stories'
      and policyname = 'interview_stories_select_own'
  ) then
    create policy interview_stories_select_own on public.interview_stories
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_stories'
      and policyname = 'interview_stories_insert_own'
  ) then
    create policy interview_stories_insert_own on public.interview_stories
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_stories'
      and policyname = 'interview_stories_update_own'
  ) then
    create policy interview_stories_update_own on public.interview_stories
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_stories'
      and policyname = 'interview_stories_delete_own'
  ) then
    create policy interview_stories_delete_own on public.interview_stories
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Readiness Mirror — one row per user. Updates in place.
create table if not exists public.interview_readiness (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  target_role_function text,
  dsa_score            integer not null default 0,
  system_design_score  integer not null default 0,
  behavioral_score     integer not null default 0,
  domain_score         integer not null default 0,
  actions              jsonb not null default '[]'::jsonb,
  assessment_answers   jsonb not null default '{}'::jsonb,
  source_signature     text,
  generated_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.interview_readiness enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_readiness'
      and policyname = 'interview_readiness_select_own'
  ) then
    create policy interview_readiness_select_own on public.interview_readiness
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_readiness'
      and policyname = 'interview_readiness_insert_own'
  ) then
    create policy interview_readiness_insert_own on public.interview_readiness
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_readiness'
      and policyname = 'interview_readiness_update_own'
  ) then
    create policy interview_readiness_update_own on public.interview_readiness
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- INTERVIEW LAB (Phase 3) — Study Plan + DSA Dispatch + Cheatsheets
-- ----------------------------------------------------------------------------

-- Personalised study plan. One row per user; regenerate replaces in place.
create table if not exists public.interview_study_plan (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  weeks                integer not null default 6,
  target_role_function text,
  target_companies     text[] not null default '{}',
  /** Full plan JSON: weeks[], each with days[], each with tasks[]. Shape is
   *  documented in apps/web/lib/llm/prompts/interview-study-plan.ts. */
  plan                 jsonb not null,
  source_signature     text,
  start_date           date not null default current_date,
  end_date             date,
  generated_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.interview_study_plan enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_plan'
      and policyname = 'interview_study_plan_select_own'
  ) then
    create policy interview_study_plan_select_own on public.interview_study_plan
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_plan'
      and policyname = 'interview_study_plan_insert_own'
  ) then
    create policy interview_study_plan_insert_own on public.interview_study_plan
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_plan'
      and policyname = 'interview_study_plan_update_own'
  ) then
    create policy interview_study_plan_update_own on public.interview_study_plan
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Daily check-off rows. One per (user, date). Used to track streaks +
-- per-day task completion ticks.
create table if not exists public.interview_study_day_progress (
  user_id            uuid not null references auth.users(id) on delete cascade,
  day                date not null,
  dsa_done           boolean not null default false,
  story_rehearsed    boolean not null default false,
  system_design_done boolean not null default false,
  mock_done          boolean not null default false,
  notes              text,
  completed_at       timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists idx_study_day_progress_user
  on public.interview_study_day_progress(user_id, day desc);

alter table public.interview_study_day_progress enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_day_progress'
      and policyname = 'study_day_progress_select_own'
  ) then
    create policy study_day_progress_select_own on public.interview_study_day_progress
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_day_progress'
      and policyname = 'study_day_progress_insert_own'
  ) then
    create policy study_day_progress_insert_own on public.interview_study_day_progress
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_study_day_progress'
      and policyname = 'study_day_progress_update_own'
  ) then
    create policy study_day_progress_update_own on public.interview_study_day_progress
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Daily DSA dispatch — what problem was given to each user each day.
-- problem_slug references a static catalog (packages/shared/src/dsa-catalog.ts).
create table if not exists public.interview_daily_dispatch (
  user_id            uuid not null references auth.users(id) on delete cascade,
  day                date not null,
  problem_slug       text not null,
  /** AI-generated personalisation (≤ 800 chars) tying the problem to the
   *  candidate's resume. Cached per (user, problem) so re-visiting today
   *  doesn't re-call the LLM. */
  personalised_note  text,
  is_complete        boolean not null default false,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists idx_daily_dispatch_user
  on public.interview_daily_dispatch(user_id, day desc);

-- Phase DSA Premium: role-aware dispatch metadata. The canonical problem body
-- remains in packages/shared/src/dsa-catalog.ts so the product stays
-- self-contained and does not depend on external problem sites. These columns
-- snapshot the dispatch context for analytics, no-repeat auditing, and future
-- subscription packaging.
alter table public.interview_daily_dispatch add column if not exists role_track text;
alter table public.interview_daily_dispatch add column if not exists difficulty text;
alter table public.interview_daily_dispatch add column if not exists company_slug text;
alter table public.interview_daily_dispatch add column if not exists context_month text;
alter table public.interview_daily_dispatch add column if not exists context_snapshot jsonb not null default '{}'::jsonb;

create index if not exists idx_daily_dispatch_role_day
  on public.interview_daily_dispatch(user_id, role_track, day desc);

alter table public.interview_daily_dispatch enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_daily_dispatch'
      and policyname = 'daily_dispatch_select_own'
  ) then
    create policy daily_dispatch_select_own on public.interview_daily_dispatch
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_daily_dispatch'
      and policyname = 'daily_dispatch_insert_own'
  ) then
    create policy daily_dispatch_insert_own on public.interview_daily_dispatch
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_daily_dispatch'
      and policyname = 'daily_dispatch_update_own'
  ) then
    create policy daily_dispatch_update_own on public.interview_daily_dispatch
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Per-(user, company, round) cheatsheet cache. AI generated, refreshes when
-- resume_signature changes so cheatsheets stay anchored to the user's stack.
create table if not exists public.interview_company_cheatsheet (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  company_slug         text not null,
  role_function        text not null,
  round_type           text not null,
  title                text not null,
  body_markdown        text not null,
  source_signature     text,
  generated_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, company_slug, role_function, round_type)
);

create index if not exists idx_company_cheatsheet_user
  on public.interview_company_cheatsheet(user_id, generated_at desc);

alter table public.interview_company_cheatsheet enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_company_cheatsheet'
      and policyname = 'cheatsheet_select_own'
  ) then
    create policy cheatsheet_select_own on public.interview_company_cheatsheet
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_company_cheatsheet'
      and policyname = 'cheatsheet_insert_own'
  ) then
    create policy cheatsheet_insert_own on public.interview_company_cheatsheet
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_company_cheatsheet'
      and policyname = 'cheatsheet_update_own'
  ) then
    create policy cheatsheet_update_own on public.interview_company_cheatsheet
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'interview_company_cheatsheet'
      and policyname = 'cheatsheet_delete_own'
  ) then
    create policy cheatsheet_delete_own on public.interview_company_cheatsheet
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- DSA: per-(user, problem) spaced-repetition progress.
-- After marking a problem done, the learner self-rates mastery
-- (got_it / review / confused). Confidence drives next_review_at so we
-- can resurface problems before they're forgotten. Owner-scoped via RLS.
-- -----------------------------------------------------------------------------
do $$ begin
  create type dsa_confidence as enum ('got_it', 'review', 'confused');
exception when duplicate_object then null; end $$;

create table if not exists public.dsa_user_progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  problem_slug     text not null,
  confidence       dsa_confidence not null default 'review',
  /** Day the learner last reviewed (last "Mark Done" + rating). */
  last_reviewed_on date not null default current_date,
  /** Repetition count; informs spacing curve (1d → 3d → 7d → 21d). */
  repetitions      smallint not null default 1,
  /** When to nudge this problem back into the carousel. */
  next_review_at   date not null default (current_date + interval '3 days'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, problem_slug)
);

create index if not exists idx_dsa_user_progress_review_due
  on public.dsa_user_progress(user_id, next_review_at);

alter table public.dsa_user_progress enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dsa_user_progress'
      and policyname = 'dsa_user_progress_select_own'
  ) then
    create policy dsa_user_progress_select_own on public.dsa_user_progress
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dsa_user_progress'
      and policyname = 'dsa_user_progress_insert_own'
  ) then
    create policy dsa_user_progress_insert_own on public.dsa_user_progress
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'dsa_user_progress'
      and policyname = 'dsa_user_progress_update_own'
  ) then
    create policy dsa_user_progress_update_own on public.dsa_user_progress
      for update to authenticated using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ============================================================================
-- DSA v2 — hand-authored question bank with admin review gate
-- Replaces the v1 templated catalog. v1 has been removed from the codebase.
-- All authored content lives in packages/shared/src/dsa-v2 and is mirrored
-- into public.dsa_questions via an admin seed action. Only rows with
-- status='live' are eligible for daily dispatch.
-- ============================================================================
do $$ begin
  create type public.dsa_question_status as enum (
    'pending_review', 'live', 'rejected', 'deferred', 'archived'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.dsa_questions (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  version           integer not null default 1,
  status            public.dsa_question_status not null default 'pending_review',
  pattern           text not null,
  difficulty        text not null check (difficulty in ('easy','medium','hard')),
  primary_role      text not null,
  roles             text[] not null default '{}',
  bucket            text not null check (bucket in ('pure_dsa','ai_applied','indian_domain')),
  batch_no          integer not null default 1,
  title             text not null,
  framing           text not null,
  statement         text not null,
  input_format      text not null,
  output_format     text not null,
  constraints       jsonb not null default '[]'::jsonb,
  examples          jsonb not null default '[]'::jsonb,
  approach          jsonb not null default '[]'::jsonb,
  solution_steps    jsonb not null default '[]'::jsonb,
  code_python       text not null,
  code_java         text not null,
  code_cpp          text not null,
  complexity_time   text not null,
  complexity_space  text not null,
  pitfalls          jsonb not null default '[]'::jsonb,
  edge_cases        jsonb not null default '[]'::jsonb,
  why_it_matters    text not null,
  estimated_minutes integer not null default 25,
  authored_by       text not null default 'claude-opus-4-7',
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  internal_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_dsa_questions_status   on public.dsa_questions(status);
create index if not exists idx_dsa_questions_role     on public.dsa_questions(primary_role, status);
create index if not exists idx_dsa_questions_pattern  on public.dsa_questions(pattern, status);
create index if not exists idx_dsa_questions_batch    on public.dsa_questions(batch_no);
create index if not exists idx_dsa_questions_live     on public.dsa_questions(status, primary_role, difficulty)
  where status = 'live';

alter table public.dsa_questions enable row level security;
-- Only the service role (admin actions, dispatch worker) touches this table.
-- No authenticated user policy needed — content is delivered through
-- server actions that proxy reads after auth.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_questions' and policyname='dsa_questions_service_all'
  ) then
    create policy dsa_questions_service_all on public.dsa_questions
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Append-only audit log of review actions (approve / reject / defer / edit).
create table if not exists public.dsa_question_review_events (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.dsa_questions(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  action      text not null check (action in ('approve','reject','defer','edit','reopen')),
  reason      text,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dsa_review_events_qid
  on public.dsa_question_review_events(question_id, created_at desc);

alter table public.dsa_question_review_events enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_question_review_events'
      and policyname='dsa_review_events_service_all'
  ) then
    create policy dsa_review_events_service_all on public.dsa_question_review_events
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Extend dispatch for v2: 90-day no-repeat window + question version snapshot.
alter table public.interview_daily_dispatch add column if not exists question_version integer;
alter table public.interview_daily_dispatch add column if not exists no_repeat_days   integer not null default 90;
alter table public.interview_daily_dispatch add column if not exists question_bucket  text;
create index if not exists idx_daily_dispatch_norepeat
  on public.interview_daily_dispatch(user_id, problem_slug, day desc);


-- ============================================================================
-- DSA v2 — daily habit loop (streak · freeze · skips · per-day log)
-- Backs the redesigned /dsa daily reading experience. Period resets (weekly
-- skips, monthly full-approach credits, daily bonus, freeze accrual) are
-- computed in the app layer at read time; these tables only persist the
-- raw counters plus the last reset key, so they stay safe to run repeatedly.
-- ============================================================================
create table if not exists public.dsa_streak (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  current_streak        integer not null default 0,
  longest_streak        integer not null default 0,
  last_solved_on        date,
  freeze_tokens         integer not null default 1,
  freeze_accrued_on     date not null default current_date,
  skips_used            integer not null default 0,
  skips_period_start    date not null default current_date,
  full_approaches_used  integer not null default 0,
  full_approaches_month text not null default to_char(current_date, 'YYYY-MM'),
  bonus_used            integer not null default 0,
  bonus_on              date not null default current_date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.dsa_streak enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_streak' and policyname='dsa_streak_select_own'
  ) then
    create policy dsa_streak_select_own on public.dsa_streak
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_streak' and policyname='dsa_streak_service_all'
  ) then
    create policy dsa_streak_service_all on public.dsa_streak
      for all to service_role using (true) with check (true);
  end if;
end $$;

create table if not exists public.dsa_daily_log (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null default current_date,
  slug       text not null,
  status     text not null default 'not_started' check (status in ('not_started','in_progress','solved')),
  action     text not null default 'assigned'   check (action in ('assigned','started','solved','skipped','frozen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists idx_dsa_daily_log_user on public.dsa_daily_log(user_id, day desc);

alter table public.dsa_daily_log enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_daily_log' and policyname='dsa_daily_log_select_own'
  ) then
    create policy dsa_daily_log_select_own on public.dsa_daily_log
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_daily_log' and policyname='dsa_daily_log_service_all'
  ) then
    create policy dsa_daily_log_service_all on public.dsa_daily_log
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Records which full-approach reveals a Free user has already paid a monthly
-- credit for. Lets a repeat reveal of the same question return the content
-- without re-charging a credit (idempotent unlock). Pro/Sprint are unlimited
-- and never write here.
create table if not exists public.dsa_approach_unlocks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, slug)
);

alter table public.dsa_approach_unlocks enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_approach_unlocks' and policyname='dsa_approach_unlocks_select_own'
  ) then
    create policy dsa_approach_unlocks_select_own on public.dsa_approach_unlocks
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='dsa_approach_unlocks' and policyname='dsa_approach_unlocks_service_all'
  ) then
    create policy dsa_approach_unlocks_service_all on public.dsa_approach_unlocks
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- AI-track readiness signal for personalisation (0-100).
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='interview_readiness') then
    execute 'alter table public.interview_readiness add column if not exists ai_track_readiness integer check (ai_track_readiness between 0 and 100)';
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- === SECTION: UPDATED_AT TRIGGERS ===
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
-- === SECTION: RLS POLICIES ===
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

-- companies: public read for everyone (companies info is public-domain —
--   51 approved product brands, names + slugs + logos sourced from their
--   own marketing pages). Writes via service role only.
drop policy if exists "companies_read_authed" on public.companies;
drop policy if exists "companies_read_public" on public.companies;
create policy "companies_read_public"
  on public.companies for select
  to anon, authenticated
  using (true);

-- jobs: anon can read ACTIVE rows only (deactivated/stale rows stay hidden
--   so the public surface never shows roles that no longer exist on the
--   employer career page). Authenticated users see all (for in-app match
--   recompute, history, etc.). Writes via service role only.
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
-- === SECTION: STORAGE BUCKET ===
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
create index if not exists idx_jobs_match_feed_keyset
  on public.jobs (id)
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
  add column if not exists extracted_resume  jsonb,
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
-- === SECTION: SEED DATA ===
-- 8. SEED — 51 approved product companies (no jobs)
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
  ('flipkart',   'Flipkart',    'https://www.flipkartcareers.com/',                                                                         array['Bengaluru']),
  -- Tier 1 expansion — global elite
  ('adobe',        'Adobe',        'https://careers.adobe.com/us/en/search-results?qcountry=India',                              array['Bengaluru','Noida']),
  ('intuit',       'Intuit',       'https://jobs.intuit.com/search-jobs/India',                                                  array['Bengaluru']),
  ('uber',         'Uber',         'https://www.uber.com/global/en/careers/list/?location=IND',                                  array['Bengaluru','Hyderabad','Gurugram']),
  ('paypal',       'PayPal',       'https://paypal.eightfold.ai/careers?location=India',                                         array['Bengaluru','Chennai','Hyderabad']),
  ('servicenow',   'ServiceNow',   'https://careers.servicenow.com/careers-home/jobs?country=India',                             array['Hyderabad','Bengaluru']),
  ('stripe',       'Stripe',       'https://stripe.com/jobs/search?office_locations=India',                                      array['Bengaluru','Remote-India']),
  -- Tier 2 — Indian unicorns + SaaS
  ('freshworks',   'Freshworks',   'https://careers.freshworks.com/jobs',                                                        array['Chennai','Bengaluru','Hyderabad']),
  ('zoho',         'Zoho',         'https://careers.zohocorp.com/jobs/Careers',                                                  array['Chennai','Bengaluru','Tenkasi']),
  ('postman',      'Postman',      'https://www.postman.com/company/careers/open-positions/',                                    array['Bengaluru','Remote-India']),
  ('browserstack', 'BrowserStack', 'https://www.browserstack.com/careers',                                                       array['Mumbai','Bengaluru']),
  ('chargebee',    'Chargebee',    'https://www.chargebee.com/careers/open-positions/',                                          array['Chennai','Bengaluru']),
  ('meesho',       'Meesho',       'https://www.meesho.io/careers/open-jobs',                                                    array['Bengaluru']),
  ('nykaa',        'Nykaa',        'https://www.nykaa.com/careers/jobs',                                                         array['Mumbai','Bengaluru']),
  ('dream11',      'Dream11',      'https://careers.dream11.com/jobs',                                                           array['Mumbai']),
  ('policybazaar', 'PolicyBazaar', 'https://www.policybazaar.com/careers/jobs',                                                  array['Gurugram','Mumbai']),
  ('lenskart',     'Lenskart',     'https://careers.lenskart.com/',                                                              array['Gurugram','Bengaluru','Delhi NCR']),
  ('udaan',        'Udaan',        'https://udaan.com/career.html',                                                              array['Bengaluru']),
  ('delhivery',    'Delhivery',    'https://www.delhivery.com/careers/',                                                         array['Gurugram','Bengaluru']),
  -- Tier 3 — emerging & solid product
  ('sharechat',    'ShareChat',    'https://sharechat.com/careers',                                                              array['Bengaluru']),
  ('ola',          'Ola',          'https://olacabs.com/careers',                                                                 array['Bengaluru']),
  ('paytm',        'Paytm',        'https://jobs.paytm.com/',                                                                    array['Noida','Bengaluru','Mumbai']),
  ('inmobi',       'InMobi',       'https://www.inmobi.com/company/careers/',                                                    array['Bengaluru','Gurugram']),
  ('unacademy',    'Unacademy',    'https://unacademy.com/careers',                                                              array['Bengaluru']),
  ('cars24',       'Cars24',       'https://www.cars24.com/careers/',                                                            array['Gurugram','Bengaluru']),
  ('myntra',       'Myntra',       'https://careers.myntra.com/',                                                                array['Bengaluru']),
  ('practo',       'Practo',       'https://www.practo.com/company/careers',                                                     array['Bengaluru']),
  ('pine-labs',    'Pine Labs',    'https://www.pinelabs.com/careers',                                                           array['Noida','Bengaluru']),
  ('nobroker',     'NoBroker',     'https://www.nobroker.in/careers',                                                            array['Bengaluru']),
  ('wingify',      'Wingify',      'https://wingify.com/careers/',                                                               array['Delhi NCR','Remote-India']),
  ('clevertap',    'CleverTap',    'https://clevertap.com/careers/',                                                             array['Mumbai','Bengaluru']),
  ('moengage',     'MoEngage',     'https://www.moengage.com/about-us/careers/',                                                 array['Bengaluru']),
  ('yellow-ai',    'Yellow.ai',    'https://yellow.ai/careers/',                                                                 array['Bengaluru','Remote-India']),
  ('arcesium',     'Arcesium',     'https://www.arcesium.com/careers',                                                           array['Bengaluru','Hyderabad'])
on conflict (slug) do update set
  name = excluded.name,
  careers_url = excluded.careers_url,
  hubs = excluded.hubs,
  updated_at = now();


-- -----------------------------------------------------------------------------
-- Phase M1 - Monetization + payment entitlements
-- -----------------------------------------------------------------------------
-- Billing is deliberately separate from authorization. Founder/friend grants
-- unlock paid membership features only; admin access remains controlled by the
-- server-side ADMIN_EMAILS allowlist in the web app.

do $$ begin
  create type billing_provider as enum ('dodo', 'razorpay', 'stripe', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_plan as enum ('free', 'pro', 'career_sprint');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'incomplete', 'active', 'trialing', 'on_hold', 'past_due',
    'cancelled', 'expired', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_kind as enum ('tailored_resume', 'resume_reparse', 'priority_recompute');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_event_type as enum (
    'checkout_started', 'checkout_completed', 'subscription_changed',
    'payment_succeeded', 'payment_failed', 'refund_succeeded',
    'promo_redeemed', 'admin_grant_created'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type entitlement_grant_type as enum (
    'pro_12_months', 'pro_lifetime', 'career_sprint_3_months', 'credits_fixed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.billing_customers (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  dodo_customer_id      text,
  razorpay_customer_id  text,
  stripe_customer_id    text,
  billing_email         text,
  country               text default 'IN',
  currency              text not null default 'INR',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists ux_billing_customers_dodo
  on public.billing_customers(dodo_customer_id) where dodo_customer_id is not null;
create unique index if not exists ux_billing_customers_razorpay
  on public.billing_customers(razorpay_customer_id) where razorpay_customer_id is not null;
create unique index if not exists ux_billing_customers_stripe
  on public.billing_customers(stripe_customer_id) where stripe_customer_id is not null;

create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  provider                 billing_provider not null,
  provider_customer_id      text,
  provider_subscription_id  text,
  provider_product_id       text,
  plan                     billing_plan not null,
  status                   subscription_status not null default 'incomplete',
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean not null default false,
  cancelled_at             timestamptz,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists ux_subscriptions_provider_subscription
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists idx_subscriptions_user_status
  on public.subscriptions(user_id, status, current_period_end desc);

create table if not exists public.user_entitlements (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  plan                      billing_plan not null default 'free',
  source                    text not null default 'free',
  active_until              timestamptz,
  tailored_resume_limit     integer not null default 5,
  priority_level            integer not null default 0,
  feature_flags             jsonb not null default '{}'::jsonb,
  refreshed_at              timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             credit_kind not null,
  amount           integer not null,
  reason           text not null,
  reference_key    text,
  expires_at       timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  constraint credit_ledger_nonzero_amount check (amount <> 0)
);

create unique index if not exists ux_credit_ledger_reference
  on public.credit_ledger(user_id, kind, reference_key)
  where reference_key is not null;
create index if not exists idx_credit_ledger_user_kind
  on public.credit_ledger(user_id, kind, created_at desc);

create table if not exists public.payment_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           billing_provider not null,
  provider_event_id  text not null,
  event_type         text not null,
  user_id            uuid references auth.users(id) on delete set null,
  processed_at       timestamptz,
  processing_error   text,
  payload            jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create index if not exists idx_payment_events_user
  on public.payment_events(user_id, created_at desc);

create table if not exists public.invoices (
  id                   uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  provider              billing_provider not null,
  provider_invoice_id   text,
  provider_payment_id   text,
  subscription_id       uuid references public.subscriptions(id) on delete set null,
  amount                integer not null,
  currency              text not null default 'INR',
  status                text not null,
  hosted_invoice_url    text,
  receipt_url           text,
  tax_amount            integer,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists ux_invoices_provider_invoice
  on public.invoices(provider, provider_invoice_id) where provider_invoice_id is not null;
create index if not exists idx_invoices_user_created
  on public.invoices(user_id, created_at desc);

create table if not exists public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  invoice_id           uuid references public.invoices(id) on delete set null,
  provider             billing_provider not null,
  provider_refund_id   text,
  amount               integer,
  currency             text not null default 'INR',
  status               text not null default 'requested',
  reason               text,
  metadata             jsonb not null default '{}'::jsonb,
  requested_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_refunds_user_requested
  on public.refunds(user_id, requested_at desc);

create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code_label        text,
  code_hash         text not null,
  salt              text not null default encode(gen_random_bytes(16), 'hex'),
  grant_type        entitlement_grant_type not null,
  credit_kind       credit_kind,
  credit_amount     integer,
  duration_days     integer,
  max_redemptions   integer,
  redeemed_count    integer not null default 0,
  expires_at        timestamptz,
  is_active         boolean not null default true,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint promo_codes_credit_amount_chk check (
    grant_type <> 'credits_fixed' or (credit_kind is not null and credit_amount is not null and credit_amount > 0)
  )
);

create unique index if not exists ux_promo_codes_hash
  on public.promo_codes(code_hash);

create table if not exists public.promo_redemptions (
  id             uuid primary key default gen_random_uuid(),
  promo_code_id  uuid not null references public.promo_codes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  redeemed_at    timestamptz not null default now(),
  unique(promo_code_id, user_id)
);

create index if not exists idx_promo_redemptions_user
  on public.promo_redemptions(user_id, redeemed_at desc);

create table if not exists public.entitlement_grants (
  id              uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  grant_type       entitlement_grant_type not null,
  plan             billing_plan,
  credit_kind      credit_kind,
  credit_amount    integer,
  starts_at        timestamptz not null default now(),
  expires_at       timestamptz,
  source           text not null,
  source_ref       uuid,
  reason           text,
  granted_by       uuid references auth.users(id) on delete set null,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_entitlement_grants_user
  on public.entitlement_grants(user_id, starts_at desc);

do $$
declare
  t text;
  tables text[] := array[
    'billing_customers', 'subscriptions', 'user_entitlements',
    'invoices', 'refunds', 'promo_redemptions', 'entitlement_grants',
    'credit_ledger', 'payment_events', 'promo_codes'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

drop policy if exists billing_customers_select_own on public.billing_customers;
create policy billing_customers_select_own on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own on public.user_entitlements
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists refunds_select_own on public.refunds;
create policy refunds_select_own on public.refunds
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists refunds_insert_own on public.refunds;
create policy refunds_insert_own on public.refunds
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists promo_redemptions_select_own on public.promo_redemptions;
create policy promo_redemptions_select_own on public.promo_redemptions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists entitlement_grants_select_own on public.entitlement_grants;
create policy entitlement_grants_select_own on public.entitlement_grants
  for select to authenticated using (user_id = (select auth.uid()));

do $$
declare
  t text;
  tables text[] := array[
    'billing_customers', 'subscriptions', 'user_entitlements',
    'invoices', 'refunds', 'promo_codes', 'entitlement_grants'
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

-- Updated erasure function including local billing-entitlement state. Payment
-- processors remain separate controllers for their hosted receipts and KYC data.
create or replace function public.request_user_erasure(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.interview_notes where application_id in (
    select id from public.applications where user_id = uid
  );
  delete from public.refunds where user_id = uid;
  delete from public.invoices where user_id = uid;
  delete from public.credit_ledger where user_id = uid;
  delete from public.entitlement_grants where user_id = uid;
  delete from public.promo_redemptions where user_id = uid;
  delete from public.payment_events where user_id = uid;
  delete from public.user_entitlements where user_id = uid;
  delete from public.subscriptions where user_id = uid;
  delete from public.billing_customers where user_id = uid;
  delete from public.applications where user_id = uid;
  delete from public.matches where user_id = uid;
  delete from public.stories where user_id = uid;
  delete from public.offers where user_id = uid;
  delete from public.digest_subscriptions where user_id = uid;
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;

  insert into public.dpdp_events (user_id, event, metadata)
  values (uid, 'erasure_completed', jsonb_build_object('completed_at', now()));
end;
$$;
revoke all on function public.request_user_erasure(uuid) from public, anon, authenticated;
grant execute on function public.request_user_erasure(uuid) to service_role;


-- =============================================================================
-- Phase M2 — Admin audit log + user suspension flag
--   Captures every admin action so we have an immutable trail of who did
--   what (grants, refunds, suspensions, deletes). Powered by server actions
--   inside /admin/* pages — there is no manual SQL editing.
-- =============================================================================

create table if not exists public.admin_actions (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references auth.users(id) on delete set null,
  actor_email     text not null,
  action_type     text not null,
  target_user_id  uuid references auth.users(id) on delete set null,
  target_ref      text,
  status          text not null default 'success',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_admin_actions_created
  on public.admin_actions(created_at desc);
create index if not exists idx_admin_actions_actor
  on public.admin_actions(actor_id, created_at desc);
create index if not exists idx_admin_actions_target
  on public.admin_actions(target_user_id, created_at desc);

alter table public.admin_actions enable row level security;
-- Only service role writes/reads. No public select policy on purpose.

-- User suspension flag on profiles (idempotent column add)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'suspended_at'
  ) then
    alter table public.profiles add column suspended_at timestamptz;
    alter table public.profiles add column suspension_reason text;
  end if;
end $$;

-- =============================================================================
-- Phase N — Web Push notifications (DPDP-gated, owner-scoped)
--   • `notifications` value added to consent_purpose (the legal basis)
--   • push_subscriptions: one row per browser PushSubscription, owner-scoped
--   • notifications: delivery log + in-app feed, service-role write only
--   • Re-issues request_user_erasure() to explicitly clear both tables
-- Privacy: we only ever store the title/body WE generate — no resume content,
-- no parsed profile fields, no PII from matching ever reaches these tables.
-- =============================================================================

-- (1) Consent purpose (idempotent enum extension).
alter type consent_purpose add value if not exists 'notifications';

-- (2) push_subscriptions — the device transport. Unique per endpoint so a
--     browser re-subscribing updates in place. disabled_at soft-retires dead
--     endpoints (404/410 from the push service) without losing history.
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  failure_count integer not null default 0,
  disabled_at   timestamptz
);
create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions(user_id) where disabled_at is null;

-- (3) notifications — append-only delivery log; doubles as the in-app feed.
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  url         text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);

-- (4) RLS.
alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

-- push_subscriptions: the owner manages their own device rows.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select
  to authenticated using (user_id = (select auth.uid()));
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert
  to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions for update
  to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete
  to authenticated using (user_id = (select auth.uid()));

-- notifications: owner reads + marks read; only the service-role dispatcher writes.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  to authenticated using (user_id = (select auth.uid()));
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update
  to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- (5) Re-issue erasure to explicitly clear push data. The auth.users on-delete
--     cascade already covers both tables, but we delete first so the
--     dpdp_events audit row records the erasure in full.
create or replace function public.request_user_erasure(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.interview_notes where application_id in (
    select id from public.applications where user_id = uid
  );
  delete from public.refunds where user_id = uid;
  delete from public.invoices where user_id = uid;
  delete from public.credit_ledger where user_id = uid;
  delete from public.entitlement_grants where user_id = uid;
  delete from public.promo_redemptions where user_id = uid;
  delete from public.payment_events where user_id = uid;
  delete from public.user_entitlements where user_id = uid;
  delete from public.subscriptions where user_id = uid;
  delete from public.billing_customers where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.push_subscriptions where user_id = uid;
  delete from public.applications where user_id = uid;
  delete from public.matches where user_id = uid;
  delete from public.stories where user_id = uid;
  delete from public.offers where user_id = uid;
  delete from public.digest_subscriptions where user_id = uid;
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;

  insert into public.dpdp_events (user_id, event, metadata)
  values (uid, 'erasure_completed', jsonb_build_object('completed_at', now()));
end;
$$;
revoke all on function public.request_user_erasure(uuid) from public, anon, authenticated;
grant execute on function public.request_user_erasure(uuid) to service_role;

comment on table public.push_subscriptions is 'Web Push transport endpoints, one per browser PushSubscription. Owner-scoped via RLS; dead endpoints soft-retired with disabled_at.';
comment on table public.notifications is 'Append-only push delivery log + in-app feed. Service-role write only. Stores only self-generated title/body — never resume/PII content.';


-- =============================================================================
-- DONE. Verify in Supabase Studio:
--   • 51 rows in `companies`, 0 rows in `jobs`
--   • RLS enabled on every table above
--   • Storage bucket `resumes` exists and is private
-- =============================================================================
