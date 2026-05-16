import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedJob } from "@prodmatch/shared";
import type { EnrichedJob } from "./parse.js";
import { log } from "../lib/logger.js";

export interface UpsertResult {
  inserted: number;
  updated: number;
  markedStale: number;
}

// Build the "parse-fields" patch that lands atomically with the row when
// we have parse output for it. Empty object when we don't (description
// unchanged → existing row already has these populated).
function parsePatch(j: EnrichedJob): Record<string, unknown> {
  if (!j.needsParse || !j.parsed) return {};
  const p = j.parsed;
  const patch: Record<string, unknown> = {
    must_have_skills:    p.must_have_skills,
    nice_to_have_skills: p.nice_to_have_skills,
    jd_min_years:        p.jd_min_years,
    jd_max_years:        p.jd_max_years,
    work_mode:           p.work_mode,
    jd_seniority_signal: p.jd_seniority_signal,
    jd_summary:          p.jd_summary,
    is_likely_ghost:     p.is_boilerplate,
    ghost_signals:       { reasons: p.ghost_reasons },
    role_function_jd:        p.role_function_jd,
    responsibilities:        p.responsibilities,
    qualifications_required: p.qualifications_required,
    qualifications_preferred: p.qualifications_preferred,
    tech_stack_explicit:     p.tech_stack_explicit,
    team_context:            p.team_context,
    jd_parsed_at:        new Date().toISOString(),
  };
  if (j.embedding && j.embedding.length > 0) {
    patch.embedding = j.embedding;
    patch.embedding_at = new Date().toISOString();
  }
  return patch;
}

// Strip the EnrichedJob-only fields before write — they aren't columns.
function asRow(job: EnrichedJob): Record<string, unknown> {
  const { parsed: _p, embedding: _e, needsParse: _n, ...row } = job;
  void _p; void _e; void _n;
  return row;
}

/**
 * Bulk-upsert jobs in 50-row batches.
 *
 * Strategy (one batch):
 *   1. Bulk SELECT existing rows by (company_id, external_id).
 *   2. For batch rows NOT matched by external_id, bulk SELECT by
 *      (company_id, signature) — these are signature rebinds (company
 *      changed their internal ID for the same posting).
 *   3. Rebinds are rare → handled with per-row UPDATEs.
 *   4. Everything else (existing-by-id + brand new) goes through ONE bulk
 *      `upsert(rows, onConflict='company_id,external_id')` call.
 *
 * The old per-row code did 2 SELECTs + 1 UPDATE/INSERT per job. For Amazon's
 * ~2k jobs that's ~6k round-trips. Bulk path is ~3 round-trips per batch of
 * 50 → ~120 total. Network alone is ~2 min savings for Amazon.
 */
export async function upsertJobs(
  supabase: SupabaseClient,
  companyId: string,
  jobs: EnrichedJob[],
): Promise<{ inserted: number; updated: number }> {
  if (jobs.length === 0) return { inserted: 0, updated: 0 };

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  const BATCH = 50;
  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);

    // Step 1: lookup by external_id.
    const externalIds = batch.map((j) => j.external_id);
    const { data: byExt, error: extErr } = await supabase
      .from("jobs")
      .select("id, external_id, signature")
      .eq("company_id", companyId)
      .in("external_id", externalIds);
    if (extErr) {
      log(`upsert lookup-by-ext error: ${extErr.message}`, "warn", { event: "upsert_lookup_error", data: { error: extErr.message } });
    }
    const existingExt = new Map((byExt ?? []).map((r) => [r.external_id, r]));

    // Step 2: for unmatched, lookup by signature (rebind path).
    const unmatched = batch.filter((j) => !existingExt.has(j.external_id));
    let existingSig = new Map<string, { id: string }>();
    if (unmatched.length > 0) {
      const sigs = unmatched.map((j) => j.signature);
      const { data: bySig, error: sigErr } = await supabase
        .from("jobs")
        .select("id, signature")
        .eq("company_id", companyId)
        .in("signature", sigs);
      if (sigErr) {
        log(`upsert lookup-by-sig error: ${sigErr.message}`, "warn", { event: "upsert_lookup_error", data: { error: sigErr.message } });
      }
      existingSig = new Map((bySig ?? []).map((r) => [r.signature as string, { id: r.id as string }]));
    }

    // Step 3: partition.
    const toRebind: Array<{ rowId: string; job: EnrichedJob }> = [];
    const toUpsert: EnrichedJob[] = [];

    for (const job of batch) {
      if (existingExt.has(job.external_id)) {
        toUpsert.push(job); // bulk upsert → UPDATE path via onConflict
        updated++;
      } else {
        const sigMatch = existingSig.get(job.signature);
        if (sigMatch) {
          // Same content, different external_id → rebind on the existing row.
          toRebind.push({ rowId: sigMatch.id, job });
          updated++;
        } else {
          toUpsert.push(job); // bulk upsert → INSERT path
          inserted++;
        }
      }
    }

    // Step 4: rebinds (rare, per-row).
    for (const { rowId, job } of toRebind) {
      const { error } = await supabase
        .from("jobs")
        .update({
          external_id: job.external_id,
          apply_url: job.apply_url,
          description: job.description,
          last_seen_at: now,
          is_active: true,
          ...parsePatch(job),
        })
        .eq("id", rowId);
      if (error) {
        log(`Rebind error for ${job.external_id}: ${error.message}`, "warn", { event: "rebind_error", data: { error: error.message } });
        updated--; // we counted optimistically
      }
    }

    // Step 5: one bulk upsert for everything else.
    if (toUpsert.length > 0) {
      const rows = toUpsert.map((job) => ({
        ...asRow(job),
        last_seen_at: now,
        is_active: true,
        freshness_score: 100,
        ...parsePatch(job),
      }));

      const { error } = await supabase
        .from("jobs")
        .upsert(rows, { onConflict: "company_id,external_id", ignoreDuplicates: false });

      if (error) {
        log(
          `Bulk upsert error: ${error.message} — falling back to per-row`,
          "warn",
          { event: "bulk_upsert_error", data: { batchSize: rows.length, error: error.message } },
        );
        // Recovery: per-row upsert so a single bad row doesn't sink the
        // whole batch. Costs us speed only on the rare failure case.
        let recovered = 0;
        for (const row of rows) {
          const { error: e2 } = await supabase
            .from("jobs")
            .upsert(row, { onConflict: "company_id,external_id", ignoreDuplicates: false });
          if (e2) {
            log(`Per-row upsert failed for external_id=${(row as { external_id?: string }).external_id}: ${e2.message}`, "warn", { event: "row_upsert_error" });
          } else {
            recovered++;
          }
        }
        log(`Per-row recovery: ${recovered}/${rows.length}`, "info", { event: "bulk_upsert_recovered", data: { recovered, total: rows.length } });
      }
    }
  }

  return { inserted, updated };
}

export async function markStaleJobs(
  supabase: SupabaseClient,
  companyId: string,
  runStarted: Date,
): Promise<number> {
  const { data, error } = await supabase.rpc("mark_stale_jobs", {
    company_uuid: companyId,
    run_started: runStarted.toISOString(),
  });
  if (error) {
    log(`mark_stale_jobs error: ${error.message}`, "warn");
    return 0;
  }
  return (data as number) ?? 0;
}

// Coverage-guarded deactivation. A scraper that found 20 jobs when yesterday
// it found 800 is almost certainly broken (selector drift, captcha, network).
// If we let it through, the stale-mark pass nukes 780 active jobs. Instead:
// if seen < threshold × previously-active, skip stale-marking entirely and
// flag the run as `partial`. The catalog stays warm; the next healthy crawl
// will reconcile.
export interface StaleResult {
  marked: number;
  coverage: number;        // 0..1, fraction of yesterday's active set seen
  skipped: boolean;        // true when guard tripped (no rows deactivated)
  previouslyActive: number;
}

export async function markStaleJobsGuarded(
  supabase: SupabaseClient,
  companyId: string,
  runStarted: Date,
  seenCount: number,
  minCoveragePct = 0.6,
): Promise<StaleResult> {
  const { count: previouslyActive, error: cErr } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (cErr) {
    log(`markStaleJobsGuarded: coverage check failed (${cErr.message}); proceeding without guard`, "warn");
    const marked = await markStaleJobs(supabase, companyId, runStarted);
    return { marked, coverage: 1, skipped: false, previouslyActive: 0 };
  }

  const prev = previouslyActive ?? 0;
  // If we have no baseline yet (cold start), no guard is needed.
  if (prev === 0) {
    const marked = await markStaleJobs(supabase, companyId, runStarted);
    return { marked, coverage: 1, skipped: false, previouslyActive: 0 };
  }

  const coverage = seenCount / prev;
  if (coverage < minCoveragePct) {
    log(
      `markStaleJobsGuarded: SKIP deactivation — saw ${seenCount} of ${prev} previously-active ` +
      `(${(coverage * 100).toFixed(0)}% < ${(minCoveragePct * 100).toFixed(0)}% threshold). ` +
      `Treating run as partial. Catalog left intact.`,
      "warn",
    );
    return { marked: 0, coverage, skipped: true, previouslyActive: prev };
  }

  const marked = await markStaleJobs(supabase, companyId, runStarted);
  return { marked, coverage, skipped: false, previouslyActive: prev };
}

export interface CrawlRunPayload {
  company_id: string;
  started_at: string;
  finished_at: string;
  jobs_seen: number;
  jobs_new: number;
  jobs_updated: number;
  jobs_marked_stale: number;
  status: "success" | "partial" | "failed";
  error: string | null;
}

export async function recordCrawlRun(
  supabase: SupabaseClient,
  payload: CrawlRunPayload,
): Promise<void> {
  const { error } = await supabase.from("crawl_runs").insert(payload);
  if (error) log(`Failed to record crawl_run: ${error.message}`, "warn");
}

// Re-export the NormalizedJob type so callers don't need to import from
// @prodmatch/shared just to type a function param.
export type { NormalizedJob };
