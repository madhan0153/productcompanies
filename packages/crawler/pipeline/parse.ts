// Inline JD parse during crawl — Phase J.
//
// Sits between normalize and upsert. For each normalized job, decides:
//   - new row              → parse + embed
//   - existing parsed,
//     description unchanged → SKIP (signature is stable)
//   - existing parsed,
//     description changed   → re-parse + re-embed (signature flipped)
//   - existing unparsed     → parse + embed (legacy / failed-before)
//
// Concurrency: a worker pool of N (default 2 × num_keys) calls the shared
// `parseJobDescription` runner, which already does key rotation + 429
// backoff with retry-after. Per-key 429 doesn't block — runner rotates.
// All parses commit their structured fields back onto the NormalizedJob
// (extended). Embeddings batch at the end (Gemini accepts 100 contents /
// call → 35 calls instead of 3,500 for a fresh DB).
//
// Failure isolation: a parse error on one job leaves jd_parsed_at NULL on
// that row; the safety-net Vercel endpoint will retry it on the daily cron.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type NormalizedJob,
  parseJobDescription,
  embedBatch,
  buildJobEmbedText,
  LlmRunError,
  type ParsedJD,
} from "@prodmatch/shared";
import { log } from "../lib/logger.js";
import { isNonEngineeringTitle, stripBoilerplate } from "./job-filter.js";
import { evaluateJobQuality, type QualityResult } from "./quality.js";

/**
 * Did this error indicate Gemini said "no more requests right now"?
 * Only these errors count toward the rolling quota-exhaustion window.
 * Network blips, JSON parse failures, model unavailability — none of
 * those mean we should abandon the queue.
 */
function isQuotaSignal(err: unknown): boolean {
  if (err instanceof LlmRunError) {
    // Sprint 6 — `all_keys_exhausted` joins the quota family. Without it,
    // post-Amazon companies in the 2026-05-17 run synchronously threw 164
    // "unknown" errors with no rolling-window contribution → no bail.
    return err.detail.kind === "rate_limited"
        || err.detail.kind === "quota_disabled"
        || err.detail.kind === "all_keys_exhausted";
  }
  // Fallback for raw errors that escaped the runWithRetry classifier.
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|RESOURCE_EXHAUSTED|Too Many Requests|limit:\s*0/i.test(msg);
}

/**
 * Sprint 6 — Process-level "every key is dead" signal. When runWithRetry
 * couldn't even attempt one call (all combos pre-marked in _processExhausted),
 * it throws this kind. Treat as immediate bail: a rolling-window vote is
 * useless because the throws are synchronous — 12 workers can burn 100
 * "errors" in a single event-loop tick before the window ever fills.
 */
function isAllKeysExhausted(err: unknown): boolean {
  return err instanceof LlmRunError && err.detail.kind === "all_keys_exhausted";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface EnrichedJob extends NormalizedJob {
  /** When set, upsert writes parse fields + embedding atomically with the row. */
  parsed?: ParsedJD;
  embedding?: number[];
  /** True if we should write parse fields (new or signature-changed row). */
  needsParse: boolean;
  /** Sprint 6 — populated for every kept row so upsert can write quality cols. */
  quality?: QualityResult;
}

export interface EnrichResult {
  jobs: EnrichedJob[];
  parseOk: number;
  parseErr: number;
  skippedBudget: number;
  skippedQuota: number;
  rejectedNonEng: number;
  /** Sprint 6 — count of jobs that failed the quality gate (still upserted with low quality_score). */
  qualityGated: number;
}

export interface ParseDecision {
  parse: NormalizedJob[];     // jobs that need parse + embed (new or changed)
  skip: NormalizedJob[];      // existing rows whose description didn't change
  rejected: NormalizedJob[];  // non-engineering titles — dropped pre-LLM
}

interface ExistingMeta {
  external_id: string;
  signature: string;
  jd_parsed_at: string | null;
}

const NUM_KEYS = (() => {
  const raw = process.env.GEMINI_API_KEY ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean).length || 1;
})();

// 1 worker per key — sequential workflow, polite to Gemini's free-tier
// per-key RPM (≈15-30 RPM). Multiple workers per key burst calls and trip
// 429s constantly; 1 worker per key paces calls naturally with parse
// latency (~3-5s), staying well under the limit.
const WORKERS = NUM_KEYS;

const EMBED_BATCH = 100;

// ── Decision step ───────────────────────────────────────────────────────────

export function decideWork(
  jobs: NormalizedJob[],
  existing: Map<string, ExistingMeta>,
  qualities?: Map<string, QualityResult>,
): ParseDecision {
  const parse: NormalizedJob[] = [];
  const skip: NormalizedJob[] = [];
  const rejected: NormalizedJob[] = [];

  for (const j of jobs) {
    // Non-engineering titles never reach Gemini. If the row already exists in
    // DB it will fall out of the active set via the stale-mark pass (we don't
    // bump last_seen_at on rejected rows).
    if (isNonEngineeringTitle(j.title)) {
      rejected.push(j);
      continue;
    }

    const ex = existing.get(j.external_id);
    if (!ex) {
      // Sprint 6 — Quality gate. Low-quality rows skip the LLM parse but
      // STILL upsert (with their quality_score / quality_reasons populated)
      // so they appear in `skip`. The matching engine filters them out at
      // read time via quality_score >= 40.
      const q = qualities?.get(j.external_id);
      if (q && !q.parseable) {
        skip.push(j);
        continue;
      }
      parse.push(j);
      continue;
    }
    // Already parsed AND signature unchanged → description is identical to
    // last crawl → no need to re-parse. The upsert will still bump
    // last_seen_at + write any normalized field updates.
    if (ex.jd_parsed_at && ex.signature === j.signature) {
      skip.push(j);
      continue;
    }
    // Either never parsed, or description changed materially → (re-)parse.
    // Apply quality gate to re-parse candidates too — if a posting decayed
    // (e.g. a previously-rich JD got truncated), don't waste tokens on it.
    const q = qualities?.get(j.external_id);
    if (q && !q.parseable) {
      skip.push(j);
      continue;
    }
    parse.push(j);
  }
  return { parse, skip, rejected };
}

export async function fetchExistingMeta(
  supabase: SupabaseClient,
  companyId: string,
  externalIds: string[],
): Promise<Map<string, ExistingMeta>> {
  const map = new Map<string, ExistingMeta>();
  if (externalIds.length === 0) return map;

  // Page through to avoid PostgREST's IN-list limit on very large companies.
  const PAGE = 200;
  for (let i = 0; i < externalIds.length; i += PAGE) {
    const slice = externalIds.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("jobs")
      .select("external_id, signature, jd_parsed_at")
      .eq("company_id", companyId)
      .in("external_id", slice);
    if (error) {
      log(`fetchExistingMeta error: ${error.message}`, "warn");
      continue;
    }
    for (const r of (data as ExistingMeta[]) ?? []) {
      map.set(r.external_id, r);
    }
  }
  return map;
}

// ── Parse worker pool ───────────────────────────────────────────────────────

// Per-run parse budget: effectively uncapped for the sequential workflow.
// The old 150 default was a per-group ration for 5 parallel matrix groups
// sharing 3 keys × ~200 RPD. With sequential, the whole budget belongs to
// one run, so we let it consume up to 10k parses (more than any realistic
// crawl). Override via PARSE_BUDGET_PER_RUN env var if needed.
const PARSE_BUDGET_PER_RUN = (() => {
  const v = parseInt(process.env.PARSE_BUDGET_PER_RUN ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : 10_000;
})();

// Quota-exhaustion detection.
//
// Two scenarios we need to detect:
//
// (A) "Cold quota" — every key was already exhausted before this company
//     started parsing (e.g., previous company consumed the day's RPD).
//     We see N consecutive quota errors with ZERO successes. The old
//     heuristic required 10 successes first — so Apple grinded for 70
//     minutes with 0/217 successes before giving up. Wrong.
//
// (B) "Mid-run quota" — most jobs parsed cleanly, then keys drained mid-
//     run. We see a long window of trailing failures after many successes.
//
// COLD_BAIL_AFTER catches (A) fast — after this many consecutive quota
// errors with no successes, bail immediately. Saves 60+ min of wasted work.
//
// QUOTA_WINDOW / MIN_OK_BEFORE_BAIL catch (B) — the rolling-window check
// (full window of quota errors after enough successes to prove keys ARE
// working). Larger window tolerates transient RPM bursts that recover.
// The bail constants scale with key count. With 3 keys, 18 attempts is
// enough signal that quotas are dead. With 12 keys, you need a wider
// window — 30 outcomes can fill with transient RPM throttles before the
// cascade has even tried every model. 16:23 UTC run on Microsoft showed
// this exact symptom: 12 keys × momentary RPM blip filled the 30-window
// and triggered a false mid-run bail at 51 parses when keys were still
// healthy. Scale both windows by NUM_KEYS so 12 keys gets ~3× the headroom
// of 3 keys.
const COLD_BAIL_AFTER = Math.max(18, NUM_KEYS * 6);
const QUOTA_WINDOW    = Math.max(30, NUM_KEYS * 10);
const MIN_OK_BEFORE_BAIL = 10;

// Cross-company quota state — persists across companies in a single
// sequential crawl run. Once any company has confirmed all Gemini keys are
// dead (mid-run or cold bail), every subsequent company in the run skips
// the parse phase entirely.
//
// Without this, after Amazon burned all 3 keys at company #4, every later
// company (NVIDIA, Oracle, Salesforce, SAP Labs, Razorpay, PhonePe, Swiggy)
// still kicked off parse workers, hit COLD_BAIL_AFTER attempts of 18 wasted
// quota_disabled calls, waited a long time on retry backoffs, and added up
// to ~45 minutes of wall-clock with zero useful work. The state below lets
// every later company short-circuit in milliseconds.
//
// State resets when the Node process exits → next GitHub Actions run starts
// fresh, which is the correct semantic (the new run gets a new day or a
// new RPD window). NOT exported — only the parseWithWorkers function flips
// the flag, and only enrichWithParse reads it.
let _runQuotaExhausted = false;
let _quotaExhaustedAt: string | null = null;

/**
 * Lets callers (or tests) reset the cross-company quota flag between runs.
 * The flag also implicitly resets when the process exits.
 */
export function resetRunQuotaState(): void {
  _runQuotaExhausted = false;
  _quotaExhaustedAt = null;
}

interface ParseStats {
  ok: number;
  err: number;
  skippedBudget: number;
  skippedQuota: number;
  errSamples: Array<{ title: string; reason: string }>;
}

async function parseWithWorkers(
  jobs: NormalizedJob[],
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error", extra?: { event?: string; data?: Record<string, unknown> }) => void,
): Promise<{ map: Map<string, ParsedJD>; stats: ParseStats }> {
  const map = new Map<string, ParsedJD>();
  const stats: ParseStats = { ok: 0, err: 0, skippedBudget: 0, skippedQuota: 0, errSamples: [] };
  if (jobs.length === 0) return { map, stats };

  const queue = [...jobs];
  const total = jobs.length;
  // Shared mutable flag — when set, all workers drain their remaining picks
  // without calling Gemini. Avoids a costly race where multiple workers each
  // spend 10s finding out the quota is gone.
  let bailReason: "budget" | "quota" | null = null;
  // Sliding window of recent outcomes (true=ok, false=err) for quota detection.
  const recentOutcomes: boolean[] = [];

  const worker = async (workerId: number) => {
    while (true) {
      const j = queue.shift();
      if (!j) return;

      if (bailReason) {
        if (bailReason === "budget") stats.skippedBudget++;
        else stats.skippedQuota++;
        continue;
      }

      // Budget guard — check before starting the Gemini call.
      if (stats.ok >= PARSE_BUDGET_PER_RUN) {
        bailReason = "budget";
        stats.skippedBudget++;
        // Drain the queue immediately so sibling workers exit fast.
        const remaining = queue.splice(0);
        stats.skippedBudget += remaining.length;
        cLog(
          `Parse budget reached (${PARSE_BUDGET_PER_RUN} successful parses). ` +
          `${stats.skippedBudget} job(s) deferred to tomorrow's crawl.`,
          "warn",
        );
        return;
      }

      // Pre-distribute keys across workers — runner still rotates on 429,
      // but starting each worker on a different key avoids thundering herd.
      const startKeyIndex = workerId % NUM_KEYS;
      try {
        const parsed = await parseJobDescription(
          {
            title: j.title,
            description: stripBoilerplate(j.description),
            seniority_hint: j.seniority,
          },
          // 60s cap per call: lets the runner back off through a full RPM
          // recovery window before giving up. Sequential workflow has no
          // sibling jobs racing for quota, so waiting is cheap. Daily quota
          // exhaustion (vs transient RPM 429s) is caught by the rolling-
          // window check below.
          { startKeyIndex, maxRateLimitWaitMs: 60_000 },
        );
        map.set(j.external_id, parsed);
        stats.ok++;
        recentOutcomes.push(true);
      } catch (err) {
        stats.err++;
        const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
        if (stats.errSamples.length < 5) {
          stats.errSamples.push({ title: j.title.slice(0, 60), reason: reason.slice(0, 140) });
        }
        // Sprint 6 — Fast bail: runWithRetry signalled that EVERY (model × key)
        // is pre-exhausted. No point letting workers spin through more jobs;
        // their calls would synchronously throw the same error. Flip the run
        // flag, drain the queue, exit. Without this short-circuit, a 12-key
        // run after Amazon exhausts quota burns 164 JDs in milliseconds (see
        // 2026-05-17 16:51 UTC log: SAP Labs 118/118 ok=0 err=118 in 0s).
        if (isAllKeysExhausted(err) && !bailReason) {
          bailReason = "quota";
          _runQuotaExhausted = true;
          _quotaExhaustedAt = new Date().toISOString();
          const remaining = queue.splice(0);
          stats.skippedQuota += remaining.length;
          cLog(
            `All Gemini keys pre-exhausted at job #${stats.ok + stats.err} — no API call attempted. ` +
            `Deferring ${stats.skippedQuota} JD${stats.skippedQuota === 1 ? "" : "s"} to next crawl. ` +
            `Marking quota exhausted for the rest of this run.`,
            "warn",
            { event: "all_keys_exhausted_bail", data: { successes: stats.ok, deferred: stats.skippedQuota } },
          );
          return;
        }
        // Only count Gemini-quota signals toward the bail window. Network
        // blips, JSON parse failures, model unavailability — none of those
        // mean we should abandon the queue. Treat them as benign for the
        // purposes of quota detection (still recorded in stats.err).
        recentOutcomes.push(isQuotaSignal(err) ? false : true);
      }

      // Keep window bounded.
      if (recentOutcomes.length > QUOTA_WINDOW) recentOutcomes.shift();

      // (A) Cold-bail: started this company with already-exhausted keys.
      // If we've hit COLD_BAIL_AFTER attempts with 0 successes and the
      // recent window is all-quota-errors, the keys are cooked. Stop now —
      // Apple's case where this would have saved 60+ minutes.
      if (
        !bailReason &&
        stats.ok === 0 &&
        stats.err >= COLD_BAIL_AFTER &&
        recentOutcomes.length >= COLD_BAIL_AFTER &&
        recentOutcomes.every((v) => !v)
      ) {
        bailReason = "quota";
        _runQuotaExhausted = true;
        _quotaExhaustedAt = new Date().toISOString();
        const remaining = queue.splice(0);
        stats.skippedQuota += remaining.length;
        cLog(
          `Gemini quota exhausted before this company could start (0 successes in ${stats.err} attempts). ` +
          `${stats.skippedQuota} job(s) deferred — will be retried next crawl. ` +
          `Marking quota exhausted for the rest of this run.`,
          "warn",
          { event: "cold_quota_bail", data: { attempts: stats.err, deferred: stats.skippedQuota } },
        );
        return;
      }

      // (B) Mid-run bail: rolling window full of quota errors after enough
      // successes to prove keys WERE working. Daily quota burned mid-run.
      if (
        !bailReason &&
        recentOutcomes.length >= QUOTA_WINDOW &&
        stats.ok >= MIN_OK_BEFORE_BAIL &&
        recentOutcomes.every((v) => !v)
      ) {
        bailReason = "quota";
        _runQuotaExhausted = true;
        _quotaExhaustedAt = new Date().toISOString();
        const remaining = queue.splice(0);
        stats.skippedQuota += remaining.length;
        cLog(
          `Gemini daily quota exhausted after ${stats.ok} parse(s). ` +
          `${stats.skippedQuota} job(s) deferred — will be retried next crawl. ` +
          `Marking quota exhausted for the rest of this run.`,
          "warn",
          { event: "midrun_quota_bail", data: { successes: stats.ok, deferred: stats.skippedQuota } },
        );
        return;
      }

      const done = stats.ok + stats.err;
      if (done % 25 === 0 || done === total) {
        cLog(`  parse: ${done}/${total} ok=${stats.ok} err=${stats.err}`);
      }
    }
  };

  const actualKeys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean).length;
  cLog(
    `Parsing ${total} JD${total === 1 ? "" : "s"} with ${WORKERS} workers across ${actualKeys} key${actualKeys === 1 ? "" : "s"} ` +
    `(budget=${PARSE_BUDGET_PER_RUN}/run)…`,
  );
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  const elapsed = Math.round((Date.now() - t0) / 1000);
  cLog(
    `Parse done: ok=${stats.ok} err=${stats.err} ` +
    (stats.skippedBudget ? `budget_skip=${stats.skippedBudget} ` : "") +
    (stats.skippedQuota ? `quota_skip=${stats.skippedQuota} ` : "") +
    `| ${elapsed}s${companyName ? ` (${companyName})` : ""}`,
  );
  if (stats.errSamples.length > 0) {
    for (const s of stats.errSamples) {
      cLog(`  parse err [${s.title}]: ${s.reason}`, "warn");
    }
  }
  return { map, stats };
}

// ── Batched embed step ──────────────────────────────────────────────────────

async function embedJobsBatched(
  jobs: NormalizedJob[],
  parsedMap: Map<string, ParsedJD>,
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error", extra?: { event?: string; data?: Record<string, unknown> }) => void,
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  const targets = jobs.filter((j) => parsedMap.has(j.external_id));
  if (targets.length === 0) return out;

  const t0 = Date.now();
  cLog(`Embedding ${targets.length} JDs in batches of ${EMBED_BATCH}…`);

  for (let i = 0; i < targets.length; i += EMBED_BATCH) {
    const slice = targets.slice(i, i + EMBED_BATCH);
    const texts = slice.map((j) => {
      const p = parsedMap.get(j.external_id)!;
      return buildJobEmbedText({
        title: j.title,
        company: companyName,
        jd_summary: p.jd_summary,
        must_have_skills: p.must_have_skills,
        nice_to_have_skills: p.nice_to_have_skills,
        description: j.description,
        role_function: p.role_function_jd,
        jd_seniority_signal: p.jd_seniority_signal,
        responsibilities: p.responsibilities,
        team_context: p.team_context,
      });
    });

    let vectors: number[][] | null = null;
    let attempt = 0;
    let lastErr: unknown = null;
    // Bulk batch attempt with one retry. Most embed failures are transient
    // (429 across all keys, network blip) and recover after ~5s.
    while (attempt < 2 && vectors === null) {
      attempt++;
      try {
        vectors = await embedBatch(texts);
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
          cLog(`  embed batch ${i}-${i + slice.length} attempt ${attempt} failed (${reason}); retrying in 5s`, "warn");
          await sleep(5_000);
        }
      }
    }

    // If the bulk batch still failed, fall back to single-item embeds.
    // Slow but recoverable — at worst we get partial coverage instead of
    // zero coverage for these 100 jobs.
    if (vectors === null) {
      const reason = lastErr instanceof Error ? lastErr.message.split("\n")[0] : String(lastErr);
      cLog(`  embed batch ${i}-${i + slice.length} failed twice (${reason}); falling back to single-item`, "warn");
      vectors = [];
      let singleOk = 0;
      for (const t of texts) {
        try {
          const v = await embedBatch([t]);
          vectors.push(v[0] ?? []);
          if (v[0] && v[0].length > 0) singleOk++;
        } catch {
          vectors.push([]);
        }
      }
      cLog(`  embed batch ${i}-${i + slice.length} single-item recovery: ${singleOk}/${texts.length}`, "warn");
    }

    for (let k = 0; k < slice.length; k++) {
      const v = vectors[k];
      if (v && v.length > 0) out.set(slice[k].external_id, v);
    }
    cLog(`  embed: ${Math.min(i + EMBED_BATCH, targets.length)}/${targets.length}`);
  }

  cLog(`Embed done: ${out.size}/${targets.length} | ${Math.round((Date.now() - t0) / 1000)}s`);
  return out;
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function enrichWithParse(
  supabase: SupabaseClient,
  companyId: string,
  companyName: string,
  jobs: NormalizedJob[],
  cLog: (msg: string, level?: "info" | "warn" | "error", extra?: { event?: string; data?: Record<string, unknown> }) => void,
): Promise<EnrichResult> {
  if (jobs.length === 0) {
    return { jobs: [], parseOk: 0, parseErr: 0, skippedBudget: 0, skippedQuota: 0, rejectedNonEng: 0, qualityGated: 0 };
  }

  const existing = await fetchExistingMeta(
    supabase,
    companyId,
    jobs.map((j) => j.external_id),
  );

  // Sprint 6 — Quality gate. Evaluate every job up front. Low-quality rows
  // still upsert (with their quality fields populated) but skip the LLM
  // parse — that's where the token saving lives.
  const qualityByExt = new Map<string, QualityResult>();
  const qualityReasonCounts: Record<string, number> = {};
  let qualityGated = 0;
  for (const j of jobs) {
    const q = evaluateJobQuality(j);
    qualityByExt.set(j.external_id, q);
    if (!q.parseable) qualityGated++;
    for (const r of q.reasons) {
      qualityReasonCounts[r] = (qualityReasonCounts[r] ?? 0) + 1;
    }
  }
  if (qualityGated > 0) {
    const top = Object.entries(qualityReasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, n]) => `${r}=${n}`)
      .join(", ");
    cLog(
      `Quality gate: ${qualityGated}/${jobs.length} job(s) below threshold (${top}). ` +
      `They will upsert with quality_score populated but skip LLM parse.`,
      "info",
      { event: "quality_gate", data: { gated: qualityGated, total: jobs.length, reasons: qualityReasonCounts } },
    );
  }

  const { parse, skip, rejected } = decideWork(jobs, existing, qualityByExt);
  cLog(
    `Parse decision: ${parse.length} to parse, ${skip.length} skip (already parsed, unchanged, or quality-gated)` +
    (rejected.length > 0 ? `, ${rejected.length} rejected (non-engineering title)` : ""),
  );

  // Cross-company quota short-circuit. If an earlier company in this run
  // already proved all keys are dead, every parse here would just produce
  // 18 quota_disabled attempts and another cold-bail log. Skip the LLM
  // phase entirely and defer parse to the next crawl. Saves ~5 minutes per
  // affected company; saved ~45 min cumulatively in the 2026-05-17 run.
  if (_runQuotaExhausted && parse.length > 0) {
    cLog(
      `Gemini quota already exhausted earlier in this run (at ${_quotaExhaustedAt}). ` +
      `Skipping parse for ${parse.length} JD${parse.length === 1 ? "" : "s"} — will be retried next crawl.`,
      "warn",
      { event: "run_quota_skip", data: { deferred: parse.length, exhaustedAt: _quotaExhaustedAt } },
    );
    const rejectedIds = new Set(rejected.map((j) => j.external_id));
    const keep = jobs.filter((j) => !rejectedIds.has(j.external_id));
    const enrichedJobs = keep.map((j) => ({
      ...j,
      parsed: undefined,
      embedding: undefined,
      needsParse: false,
      quality: qualityByExt.get(j.external_id),
    }));
    return {
      jobs: enrichedJobs,
      parseOk: 0,
      parseErr: 0,
      skippedBudget: 0,
      skippedQuota: parse.length,
      rejectedNonEng: rejected.length,
      qualityGated,
    };
  }

  const { map: parsedMap, stats } = await parseWithWorkers(parse, companyName, cLog);
  const embedMap = await embedJobsBatched(parse, parsedMap, companyName, cLog);

  // Rejected jobs are excluded from the upsert output entirely. They won't
  // get their last_seen_at bumped → the stale-mark pass will flip any
  // pre-existing copy to is_active=false on this run.
  const rejectedIds = new Set(rejected.map((j) => j.external_id));
  const keep = jobs.filter((j) => !rejectedIds.has(j.external_id));

  // Stitch results back onto the kept job list, preserving order.
  const parseIds = new Set(parse.map((p) => p.external_id));
  const enrichedJobs = keep.map((j) => {
    const parsed = parsedMap.get(j.external_id);
    const needsParse = parseIds.has(j.external_id) && Boolean(parsed);
    return {
      ...j,
      parsed,
      embedding: embedMap.get(j.external_id),
      needsParse,
      quality: qualityByExt.get(j.external_id),
    };
  });

  return {
    jobs: enrichedJobs,
    parseOk: stats.ok,
    parseErr: stats.err,
    skippedBudget: stats.skippedBudget,
    skippedQuota: stats.skippedQuota,
    rejectedNonEng: rejected.length,
    qualityGated,
  };
}

// ── Dry-run helper for the 5-job preview ────────────────────────────────────

export async function dryRunParse(
  jobs: NormalizedJob[],
  companyName: string,
  cLog: (msg: string, level?: "info" | "warn" | "error", extra?: { event?: string; data?: Record<string, unknown> }) => void,
  count = 5,
): Promise<void> {
  const sample = jobs.slice(0, count);
  cLog(`[DRY RUN] Parsing ${sample.length} sample JDs…`);
  const { map } = await parseWithWorkers(sample, companyName, cLog);
  for (const j of sample) {
    const p = map.get(j.external_id);
    console.log("\n" + "─".repeat(80));
    console.log(`TITLE:    ${j.title}`);
    console.log(`COMPANY:  ${companyName}`);
    console.log(`SIG:      ${j.signature.slice(0, 16)}…`);
    if (!p) {
      console.log("(parse failed)");
      continue;
    }
    console.log(`SUMMARY:  ${p.jd_summary}`);
    console.log(`FUNCTION: ${p.role_function_jd ?? "?"}    LEVEL: ${p.jd_seniority_signal ?? "?"}    YRS: ${p.jd_min_years ?? "?"}-${p.jd_max_years ?? "?"}    MODE: ${p.work_mode ?? "?"}`);
    if (p.team_context) console.log(`TEAM:     ${p.team_context}`);
    console.log(`MUST:     ${p.must_have_skills.join(", ") || "(none)"}`);
    console.log(`NICE:     ${p.nice_to_have_skills.join(", ") || "(none)"}`);
    if (p.responsibilities.length > 0) {
      console.log(`RESP:`);
      for (const r of p.responsibilities) console.log(`  • ${r}`);
    }
    if (p.qualifications_required.length > 0) {
      console.log(`QUAL-REQ: ${p.qualifications_required.join(" | ")}`);
    }
    if (p.qualifications_preferred.length > 0) {
      console.log(`QUAL-PREF: ${p.qualifications_preferred.join(" | ")}`);
    }
    if (p.tech_stack_explicit.length > 0) {
      console.log(`TECH:     ${p.tech_stack_explicit.join(", ")}`);
    }
    if (p.is_boilerplate) {
      console.log(`⚠ BOILERPLATE: ${p.ghost_reasons.join(", ")}`);
    }
  }
  console.log("\n" + "─".repeat(80));
}
