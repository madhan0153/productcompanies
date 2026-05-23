-- =============================================================================
-- FULL RESET — wipes every tenant + every job, leaves the schema + the 51
-- approved companies intact. Idempotent. Single transaction.
--
-- ONLY run this when you genuinely want a clean slate (no shared users,
-- pre-production). After this script:
--   - auth.users is empty → user signs up from scratch on the app
--   - jobs is empty → next crawl populates with full Phase I pipeline
--     (apply_url + descriptions + must_have_skills + embeddings)
--   - 51 companies remain seeded
--   - all enum types, indexes, RLS policies, storage bucket config remain
-- =============================================================================

-- NOTE on storage: Supabase guards storage.objects with a protect_delete
-- trigger that blocks direct DELETE/TRUNCATE from SQL, even with service
-- role. Empty the `resumes` bucket via:
--   (a) Supabase Dashboard → Storage → resumes → Empty bucket, OR
--   (b) the helper script: pnpm --filter web exec tsx scripts/clear-resumes.ts
-- This SQL handles everything else.

begin;

-- 1. Wipe all users. Cascades via FK ON DELETE CASCADE to:
--      profiles, consents, matches, applications,
--      interview_notes (via applications), stories, offers,
--      digest_subscriptions
--    Plus auth's own internal: identities, sessions, refresh_tokens, etc.
delete from auth.users;

-- 2. Wipe non-user tables. jobs has no FK from companies (companies are the
--    parent), so it survives the auth.users cascade and needs explicit
--    truncate. crawl_runs is audit; dpdp_events.user_id has no FK so it
--    doesn't cascade either.
truncate table
  public.jobs,
  public.crawl_runs,
  public.dpdp_events
restart identity cascade;

-- 4. Verify.
do $$
declare
  c_users      int := (select count(*) from auth.users);
  c_jobs       int := (select count(*) from public.jobs);
  c_matches    int := (select count(*) from public.matches);
  c_profiles   int := (select count(*) from public.profiles);
  c_apps       int := (select count(*) from public.applications);
  c_notes      int := (select count(*) from public.interview_notes);
  c_stories    int := (select count(*) from public.stories);
  c_offers     int := (select count(*) from public.offers);
  c_consents   int := (select count(*) from public.consents);
  c_subs       int := (select count(*) from public.digest_subscriptions);
  c_dpdp       int := (select count(*) from public.dpdp_events);
  c_crawl_runs int := (select count(*) from public.crawl_runs);
  c_companies  int := (select count(*) from public.companies);
begin
  raise notice 'Post-reset row counts (should all be 0 except companies = 51):';
  raise notice '  auth.users           = %', c_users;
  raise notice '  jobs                 = %', c_jobs;
  raise notice '  matches              = %', c_matches;
  raise notice '  profiles             = %', c_profiles;
  raise notice '  applications         = %', c_apps;
  raise notice '  interview_notes      = %', c_notes;
  raise notice '  stories              = %', c_stories;
  raise notice '  offers               = %', c_offers;
  raise notice '  consents             = %', c_consents;
  raise notice '  digest_subscriptions = %', c_subs;
  raise notice '  dpdp_events          = %', c_dpdp;
  raise notice '  crawl_runs           = %', c_crawl_runs;
  raise notice '  ─── preserved ───';
  raise notice '  companies            = % (expected 51)', c_companies;

  if c_companies <> 51 then
    raise warning 'companies row count is % — expected 51. Re-run the seed block at the bottom of schema.sql.', c_companies;
  end if;
end $$;

commit;

-- =============================================================================
-- After this commit, run in order:
--   1. Verify schema.sql is fully applied (Phase I columns: jobs.embedding,
--      profiles.resume_embedding etc.) Re-run schema.sql if unsure — it's
--      idempotent.
--   2. Trigger the "Daily Job Crawl" workflow from GitHub Actions. The
--      post-crawl jd_parse step parses AND embeds each newly-ingested job
--      in one pass, so apply_url, descriptions, must_have_skills, and
--      embeddings all land together.
--   3. Sign up fresh on the app, upload your resume — actions/profile.ts
--      now also embeds on upload.
--   4. Click "Compute matches" — Fit Cards on top-K with the new
--      semantic-led ranking.
-- =============================================================================
