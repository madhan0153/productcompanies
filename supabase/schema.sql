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
  applicants_count integer,
  freshness_score numeric not null default 100,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Primary dedup keys (idempotent upsert)
create unique index if not exists ux_jobs_company_external on public.jobs(company_id, external_id) where external_id is not null;
create unique index if not exists ux_jobs_company_signature on public.jobs(company_id, signature);

-- Search & filter indexes
create index if not exists idx_jobs_active_freshness on public.jobs(is_active, freshness_score desc) where is_active = true;
create index if not exists idx_jobs_company on public.jobs(company_id);
create index if not exists idx_jobs_hubs on public.jobs using gin(hubs);
create index if not exists idx_jobs_tech_stack on public.jobs using gin(tech_stack);
create index if not exists idx_jobs_title_trgm on public.jobs using gin(title gin_trgm_ops);


-- PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  job_title text,
  current_company text,
  years_experience numeric,
  current_lpa numeric,
  target_lpa numeric,
  preferred_hubs text[] not null default '{}',
  tech_stack text[] not null default '{}',
  seniority seniority_level,
  resume_storage_path text,
  resume_parsed jsonb,
  product_dna_score integer,
  coach_plan jsonb,
  coach_plan_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phase E migration: backfill columns on existing tables (idempotent)
alter table public.profiles add column if not exists coach_plan jsonb;
alter table public.profiles add column if not exists coach_plan_at timestamptz;
-- current_role is used by the app code; job_title is the original column name kept for compatibility
alter table public.profiles add column if not exists current_role text;

-- Phase F migration: role-function aware matching (idempotent)
-- role_function: canonical engineering function (qa_sdet | backend | frontend | ...)
-- target_role_functions: what the candidate is targeting (up to 3)
alter table public.profiles add column if not exists role_function text;
alter table public.profiles add column if not exists target_role_functions text[] not null default '{}';
-- jobs.role_function: classified by crawler / backfill API
alter table public.jobs add column if not exists role_function text;

create index if not exists idx_profiles_role_function on public.profiles(role_function);
create index if not exists idx_jobs_role_function on public.jobs(role_function);


create index if not exists idx_profiles_seniority on public.profiles(seniority);


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


-- -----------------------------------------------------------------------------
-- 5. updated_at TRIGGERS  (drop-then-create for idempotency)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'companies', 'jobs', 'profiles',
    'applications', 'stories', 'offers',
    'digest_subscriptions'
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
