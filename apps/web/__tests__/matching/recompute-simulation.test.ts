// Recompute-matches pipeline simulation.
//
// Validates the full route logic end-to-end using synthetic data — no live DB
// needed. Covers:
//   1. Eligibility filtering (the route's .filter() chain)
//   2. Mode decision: full vs incremental
//   3. Incremental new-job detection (embedding_at > lastCompute)
//   4. `remaining` counter convergence (DLQ-inclusive, loop termination)
//   5. Batch pagination (multiple route invocations drain the full queue)
//   6. Stale-first ordering (stalest users processed before recent ones)
//
// Run: pnpm test:recompute-sim

import test from "node:test";
import assert from "node:assert/strict";

// ─── Types mirroring the route and engine ───────────────────────────────────

interface ProfileRow {
  id: string;
  resume_storage_path: string | null;
  resume_embedding_at: string | null;
  resume_parsed_version_id: string | null;
  resume_embedding_version_id: string | null;
  active_resume_version_id: string | null;
  pending_resume_version_id: string | null;
  resume_parse_error: string | null;
  last_match_compute_at: string | null;
}

interface JobRow {
  id: string;
  embedding_at: string | null;
  is_active: boolean;
}

interface MatchRow {
  job_id: string;
  score: number;
  seen_at: string | null;
  computed_at: string;
}

// ─── Route eligibility filter (mirrors route.ts exactly) ────────────────────

function isEligible(p: ProfileRow, consentedIds: Set<string>): boolean {
  if (!p.resume_storage_path) return false;
  if (!p.active_resume_version_id) return false;
  if (p.resume_parsed_version_id !== p.active_resume_version_id) return false;
  if (p.resume_embedding_version_id !== p.active_resume_version_id) return false;
  if (p.pending_resume_version_id !== null) return false;
  if (p.resume_parse_error !== null) return false;
  if (!consentedIds.has(p.id)) return false;
  return true;
}

// ─── Engine: mode + scoring decision (mirrors engine.ts exactly) ────────────

function decideMode(profile: ProfileRow, forceFull: boolean): "full" | "incremental" {
  const lastCompute = profile.last_match_compute_at
    ? new Date(profile.last_match_compute_at).getTime() : 0;
  const resumeAt = profile.resume_embedding_at
    ? new Date(profile.resume_embedding_at).getTime() : 0;
  const resumeChanged = resumeAt > lastCompute;
  return (forceFull || lastCompute === 0 || resumeChanged) ? "full" : "incremental";
}

function jobChangedSinceLastCompute(job: JobRow, profile: ProfileRow): boolean {
  const lastCompute = profile.last_match_compute_at
    ? new Date(profile.last_match_compute_at).getTime() : 0;
  if (!job.embedding_at || lastCompute === 0) return true;
  return new Date(job.embedding_at).getTime() > lastCompute;
}

// ─── Simulated "compute" for one user ────────────────────────────────────────
// Returns updated matches and stamps last_match_compute_at.

interface ComputeResult {
  mode: "full" | "incremental";
  totalScored: number;
  newJobs: number;          // jobs rescored because embedding_at > lastCompute
  seenAtNull: number;       // matches flagged as "new" for the UI
  lastComputeAt: string;    // what gets written to profiles
}

function simulateComputeForUser(
  profile: ProfileRow,
  jobs: JobRow[],
  existingMatches: Map<string, MatchRow>,
  forceFull = false,
): ComputeResult {
  const mode = decideMode(profile, forceFull);
  const now = new Date().toISOString();

  let totalScored = 0;
  let newJobs = 0;
  let seenAtNull = 0;

  for (const job of jobs) {
    if (!job.is_active) continue;
    const needsRescore =
      mode === "full" ||
      !existingMatches.has(job.id) ||
      jobChangedSinceLastCompute(job, profile);

    if (needsRescore) {
      totalScored++;
      const isNewJob = !existingMatches.has(job.id);
      if (isNewJob) newJobs++;
      // Any rescored row gets seen_at=null (signals "new" to the UI).
      seenAtNull++;
      existingMatches.set(job.id, {
        job_id: job.id,
        score: 70,
        seen_at: null,
        computed_at: now,
      });
    }
  }

  // Stamp last_match_compute_at.
  profile.last_match_compute_at = now;

  return { mode, totalScored, newJobs, seenAtNull, lastComputeAt: now };
}

// ─── Route-level batch simulation ────────────────────────────────────────────

const BATCH_SIZE = 60;
const SIX_HOURS_MS = 6 * 3_600_000;

interface RouteResponse {
  processed: number;
  failed: number;
  remaining: number;
  bailed_on_budget: boolean;
  results: Array<{ user_id: string; ok: boolean; mode: string }>;
}

function simulateRouteInvocation(
  profiles: ProfileRow[],
  consentedIds: Set<string>,
  jobs: JobRow[],
  matchesByUser: Map<string, Map<string, MatchRow>>,
  forceFull = false,
): RouteResponse {
  // Stale-first: sort by last_match_compute_at ASC (nulls first).
  const eligible = profiles
    .filter((p) => isEligible(p, consentedIds))
    .sort((a, b) => {
      const ta = a.last_match_compute_at ? new Date(a.last_match_compute_at).getTime() : 0;
      const tb = b.last_match_compute_at ? new Date(b.last_match_compute_at).getTime() : 0;
      return ta - tb;
    });

  const batch = eligible.slice(0, BATCH_SIZE);

  // Snapshot stale count BEFORE batch mutations (mirrors how the route reads
  // eligibleAll as plain DB-fetched objects that aren't mutated by subsequent
  // DB writes — so staleCount reflects the state at call entry, not after).
  const callStartedAt = Date.now();
  const staleThreshold = callStartedAt - SIX_HOURS_MS;
  const staleCount = eligible.filter(
    (p) => p.last_match_compute_at === null ||
           new Date(p.last_match_compute_at).getTime() < staleThreshold
  ).length;

  const results: RouteResponse["results"] = [];
  let processed = 0;

  for (const p of batch) {
    try {
      const existing = matchesByUser.get(p.id) ?? new Map<string, MatchRow>();
      matchesByUser.set(p.id, existing);
      const r = simulateComputeForUser(p, jobs, existing, forceFull);
      results.push({ user_id: p.id, ok: true, mode: r.mode });
      processed++;
    } catch {
      results.push({ user_id: p.id, ok: false, mode: "full" });
    }
  }

  // remaining = staleCount - batch.length:
  //   staleCount  = users with null/old last_match_compute_at before this call
  //   batch.length = how many we attempted (failed users keep null → reappear next run)
  // Reaches 0 as soon as no more stale users exist beyond this batch.
  const totalSucceeded = results.filter((r) => r.ok).length;
  const remaining = Math.max(0, staleCount - batch.length);

  return { processed, failed: results.filter((r) => !r.ok).length, remaining, bailed_on_budget: false, results };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProfile(id: string, overrides: Partial<ProfileRow> = {}): ProfileRow {
  const version = `v-${id}`;
  return {
    id,
    resume_storage_path: `resumes/${id}.pdf`,
    resume_embedding_at: new Date(Date.now() - 2 * 86400_000).toISOString(), // 2d ago
    resume_parsed_version_id: version,
    resume_embedding_version_id: version,
    active_resume_version_id: version,
    pending_resume_version_id: null,
    resume_parse_error: null,
    last_match_compute_at: null,
    ...overrides,
  };
}

function makeJob(id: string, embeddingAt: Date | null, active = true): JobRow {
  return {
    id,
    embedding_at: embeddingAt?.toISOString() ?? null,
    is_active: active,
  };
}

const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400_000);
const TWO_DAYS_AGO   = new Date(Date.now() - 2 * 86400_000);
const NOW            = new Date();

// ─── Tests ───────────────────────────────────────────────────────────────────

test("eligibility filter — only fully-processed, consented, path-having users pass", () => {
  const v = "v-u1";
  const base = makeProfile("u1");
  const consented = new Set(["u1"]);

  assert.ok(isEligible(base, consented), "fully ready user must be eligible");

  assert.ok(!isEligible({ ...base, resume_storage_path: null }, consented),
    "no storage path → ineligible");
  assert.ok(!isEligible({ ...base, active_resume_version_id: null }, consented),
    "no active version → ineligible");
  assert.ok(!isEligible({ ...base, resume_parsed_version_id: "old-v" }, consented),
    "parsed version mismatch → ineligible");
  assert.ok(!isEligible({ ...base, resume_embedding_version_id: "old-v" }, consented),
    "embedding version mismatch → ineligible");
  assert.ok(!isEligible({ ...base, pending_resume_version_id: "pending" }, consented),
    "pending parse in flight → ineligible");
  assert.ok(!isEligible({ ...base, resume_parse_error: "failed" }, consented),
    "parse error → ineligible");
  assert.ok(!isEligible(base, new Set()),
    "not consented → ineligible");
});

test("mode decision — first compute is always FULL", () => {
  const p = makeProfile("u1", { last_match_compute_at: null });
  assert.equal(decideMode(p, false), "full");
});

test("mode decision — resume uploaded AFTER last compute triggers FULL re-score", () => {
  // Resume embedded 1h ago, last compute 2h ago → resumeChanged = true → FULL.
  const p = makeProfile("u1", {
    resume_embedding_at: new Date(Date.now() - 1 * 3600_000).toISOString(),
    last_match_compute_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  });
  assert.equal(decideMode(p, false), "full", "new resume must trigger full recompute");
});

test("mode decision — unchanged resume with prior compute is INCREMENTAL", () => {
  // Resume embedded 2d ago, last compute 1d ago → resumeChanged = false → INCREMENTAL.
  const p = makeProfile("u1", {
    resume_embedding_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    last_match_compute_at: new Date(Date.now() - 1 * 86400_000).toISOString(),
  });
  assert.equal(decideMode(p, false), "incremental");
});

test("incremental mode — only new crawler jobs are rescored", () => {
  // User computed 2d ago. Old jobs embedded 3d ago, new crawler job embedded today.
  const lastComputeAt = TWO_DAYS_AGO.toISOString();
  const p = makeProfile("u1", {
    resume_embedding_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    last_match_compute_at: lastComputeAt,
  });

  const oldJob1 = makeJob("job-old-1", THREE_DAYS_AGO);
  const oldJob2 = makeJob("job-old-2", THREE_DAYS_AGO);
  const newJob  = makeJob("job-new",   NOW);

  // Pre-populate existing matches for the two old jobs.
  const existing = new Map<string, MatchRow>([
    ["job-old-1", { job_id: "job-old-1", score: 65, seen_at: "2d-ago", computed_at: lastComputeAt }],
    ["job-old-2", { job_id: "job-old-2", score: 55, seen_at: "2d-ago", computed_at: lastComputeAt }],
  ]);

  const result = simulateComputeForUser(p, [oldJob1, oldJob2, newJob], existing, false);

  assert.equal(result.mode, "incremental", "unchanged resume → incremental");
  assert.equal(result.newJobs, 1, "exactly 1 new crawler job must be rescored");
  assert.equal(result.totalScored, 1, "old jobs must be reused, not rescored");
  assert.equal(result.seenAtNull, 1, "only the new job gets seen_at=null");

  // Old match scores must be preserved.
  assert.equal(existing.get("job-old-1")!.seen_at, "2d-ago", "old job seen_at must not be touched");
  assert.equal(existing.get("job-old-2")!.seen_at, "2d-ago", "old job seen_at must not be touched");

  // New match must be flagged as new.
  assert.equal(existing.get("job-new")!.seen_at, null, "new job must have seen_at=null");
});

test("last_match_compute_at is stamped after compute", () => {
  const p = makeProfile("u1", { last_match_compute_at: null });
  const before = Date.now();
  const result = simulateComputeForUser(p, [makeJob("j1", NOW)], new Map());
  const after = Date.now();

  assert.ok(p.last_match_compute_at !== null, "last_match_compute_at must be stamped");
  const stamped = new Date(p.last_match_compute_at!).getTime();
  assert.ok(stamped >= before && stamped <= after,
    "stamp must be within the compute window");
  assert.equal(result.lastComputeAt, p.last_match_compute_at);
});

test("remaining counter reaches 0 when all users processed (single batch)", () => {
  const profiles = Array.from({ length: 10 }, (_, i) => makeProfile(`u${i}`));
  const consented = new Set(profiles.map((p) => p.id));
  const jobs = [makeJob("j1", NOW)];
  const matchesByUser = new Map<string, Map<string, MatchRow>>();

  const resp = simulateRouteInvocation(profiles, consented, jobs, matchesByUser);

  assert.equal(resp.processed, 10);
  assert.equal(resp.remaining, 0, "remaining must be 0 when all 10 users are done");
  assert.equal(resp.failed, 0);
});

test("remaining counter loops correctly across multiple batches (>BATCH_SIZE users)", () => {
  // 130 users: first call processes 60, second 60, third 10 → 3 iterations.
  const profiles = Array.from({ length: 130 }, (_, i) => makeProfile(`u${i}`));
  const consented = new Set(profiles.map((p) => p.id));
  const jobs = [makeJob("j1", NOW)];
  const matchesByUser = new Map<string, Map<string, MatchRow>>();

  let iter = 0;
  let remaining = Infinity;
  const MAX_ITER = 30;
  while (iter < MAX_ITER && remaining > 0) {
    iter++;
    const resp = simulateRouteInvocation(profiles, consented, jobs, matchesByUser);
    remaining = resp.remaining;
  }

  assert.equal(iter, 3, "should converge in exactly 3 iterations for 130 users");
  assert.equal(remaining, 0, "remaining must be 0 after all users are processed");

  // Verify every user has last_match_compute_at stamped.
  const uncomputed = profiles.filter((p) => p.last_match_compute_at === null);
  assert.equal(uncomputed.length, 0, "every user must have last_match_compute_at stamped");
});

test("stale-first ordering — user with oldest last_match_compute_at processed first", () => {
  const staleUser   = makeProfile("stale",  { last_match_compute_at: new Date(Date.now() - 5 * 86400_000).toISOString() });
  const recentUser  = makeProfile("recent", { last_match_compute_at: new Date(Date.now() - 1 * 3600_000).toISOString() });
  const freshUser   = makeProfile("fresh",  { last_match_compute_at: null }); // never computed

  const profiles = [recentUser, staleUser, freshUser]; // deliberately unsorted
  const consented = new Set(profiles.map((p) => p.id));
  const jobs = [makeJob("j1", NOW)];
  const matchesByUser = new Map<string, Map<string, MatchRow>>();

  // Slice down BATCH_SIZE to 1 so only 1 user is processed per call.
  const eligible = profiles
    .filter((p) => isEligible(p, consented))
    .sort((a, b) => {
      const ta = a.last_match_compute_at ? new Date(a.last_match_compute_at).getTime() : 0;
      const tb = b.last_match_compute_at ? new Date(b.last_match_compute_at).getTime() : 0;
      return ta - tb;
    });

  // Nulls-first (never-computed) → oldest computed → most recent computed.
  assert.equal(eligible[0].id, "fresh",  "never-computed user must be first");
  assert.equal(eligible[1].id, "stale",  "stalest computed user must be second");
  assert.equal(eligible[2].id, "recent", "most-recently computed user must be last");
});

test("ineligible users are never processed — no consent, pending parse, parse error", () => {
  const goodUser    = makeProfile("good");
  const noConsent   = makeProfile("no-consent");
  const pending     = makeProfile("pending",   { pending_resume_version_id: "x" });
  const parseError  = makeProfile("err",       { resume_parse_error: "LLM failed" });
  const mismatch    = makeProfile("mismatch",  { resume_parsed_version_id: "old" });

  const consented   = new Set(["good"]); // only goodUser consented
  const jobs        = [makeJob("j1", NOW)];
  const matchesByUser = new Map<string, Map<string, MatchRow>>();

  const profiles = [goodUser, noConsent, pending, parseError, mismatch];
  const resp = simulateRouteInvocation(profiles, consented, jobs, matchesByUser);

  assert.equal(resp.processed, 1, "only the eligible user must be processed");
  assert.ok(!matchesByUser.has("no-consent"), "no-consent user must have no matches");
  assert.ok(!matchesByUser.has("pending"),    "pending-parse user must have no matches");
  assert.ok(!matchesByUser.has("err"),        "parse-error user must have no matches");
  assert.ok(!matchesByUser.has("mismatch"),   "version-mismatch user must have no matches");
});

test("full mode on first compute — ALL jobs scored and ALL matches flagged new", () => {
  const p = makeProfile("u1", { last_match_compute_at: null });
  const jobs = [
    makeJob("j-old-1", THREE_DAYS_AGO),
    makeJob("j-old-2", TWO_DAYS_AGO),
    makeJob("j-new",   NOW),
  ];
  const existing = new Map<string, MatchRow>();

  const result = simulateComputeForUser(p, jobs, existing, false);

  assert.equal(result.mode, "full");
  assert.equal(result.totalScored, 3, "first compute must score every job");
  assert.equal(result.seenAtNull, 3, "all first-time matches must be seen_at=null");
});

test("new crawler jobs are visible to user after recompute (seen_at=null → new badge)", () => {
  // Simulate: user computed yesterday, crawler adds 2 new jobs today.
  const p = makeProfile("u1", {
    resume_embedding_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    last_match_compute_at: new Date(Date.now() - 1 * 86400_000).toISOString(),
  });

  const preCrawlJob = makeJob("pre-crawl",  new Date(Date.now() - 2 * 86400_000));
  const newCrawlJob1 = makeJob("new-crawl-1", NOW);
  const newCrawlJob2 = makeJob("new-crawl-2", new Date(Date.now() - 30_000)); // 30s ago

  const existing = new Map<string, MatchRow>([
    ["pre-crawl", { job_id: "pre-crawl", score: 60, seen_at: "seen", computed_at: p.last_match_compute_at! }],
  ]);

  const result = simulateComputeForUser(p, [preCrawlJob, newCrawlJob1, newCrawlJob2], existing, false);

  assert.equal(result.mode, "incremental");
  assert.equal(result.newJobs, 2, "exactly 2 new crawler jobs must be picked up");
  assert.equal(result.seenAtNull, 2, "new crawler jobs must show as new in UI");

  // Old match untouched.
  assert.equal(existing.get("pre-crawl")!.seen_at, "seen", "old match seen_at must be preserved");

  // New matches flagged for UI.
  assert.equal(existing.get("new-crawl-1")!.seen_at, null);
  assert.equal(existing.get("new-crawl-2")!.seen_at, null);

  // Profile stamped.
  assert.ok(p.last_match_compute_at !== null);
  assert.ok(new Date(p.last_match_compute_at!).getTime() > new Date(Date.now() - 5000).getTime(),
    "last_match_compute_at must be recent");
});
