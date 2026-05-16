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
 *   3. Pre-classify each job into one of three lists:
 *        - toUpdateList: existing-by-id → bulk upsert (UPDATE path)
 *        - toInsertList: brand-new → bulk upsert (INSERT path)
 *        - toRebindList: signature-match-different-id → per-row UPDATE
 *   4. Counts are bumped ONLY after the actual DB write succeeds, so
 *      telemetry reflects reality even when constraints / FKs reject rows.
 *
 * Requires a NON-PARTIAL unique constraint on (company_id, external_id) for
 * ON CONFLICT to work. The partial index (… where external_id is not null)
 * is NOT accepted by Postgres's ON CONFLICT specification.
 */
const CONFLICT_TARGET = "company_id,external_id";

async function applyBulkUpsert(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
  kindLabel: "insert" | "update",
): Promise<number> {
  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("jobs")
    .upsert(rows, { onConflict: CONFLICT_TARGET, ignoreDuplicates: false });
  if (!error) return rows.length;

  log(
    `Bulk ${kindLabel} failed: ${error.message} — falling back to per-row`,
    "warn",
    { event: "bulk_upsert_error", data: { kind: kindLabel, batchSize: rows.length, error: error.message } },
  );

  // Per-row recovery so a single bad row doesn't sink the whole batch.
  let ok = 0;
  for (const row of rows) {
    const { error: e2 } = await supabase
      .from("jobs")
      .upsert(row, { onConflict: CONFLICT_TARGET, ignoreDuplicates: false });
    if (e2) {
      log(
        `Per-row ${kindLabel} failed for external_id=${(row as { external_id?: string }).external_id}: ${e2.message}`,
        "warn",
        { event: "row_upsert_error", data: { kind: kindLabel, error: e2.message } },
      );
    } else {
      ok++;
    }
  }
  log(
    `Per-row recovery: ${ok}/${rows.length} ${kindLabel}s succeeded`,
    "info",
    { event: "bulk_upsert_recovered", data: { kind: kindLabel, recovered: ok, total: rows.length } },
  );
  return ok;
}

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

    // Step 3: partition by intent. Keep insert vs update arrays separate so
    // we can attribute count increments truthfully after each bulk call.
    const toRebind: Array<{ rowId: string; job: EnrichedJob }> = [];
    const toUpdateList: Record<string, unknown>[] = [];
    const toInsertList: Record<string, unknown>[] = [];

    for (const job of batch) {
      if (existingExt.has(job.external_id)) {
        toUpdateList.push({
          ...asRow(job),
          last_seen_at: now,
          is_active: true,
          freshness_score: 100,
          ...parsePatch(job),
        });
      } else {
        const sigMatch = existingSig.get(job.signature);
        if (sigMatch) {
          toRebind.push({ rowId: sigMatch.id, job });
        } else {
          toInsertList.push({
            ...asRow(job),
            last_seen_at: now,
            is_active: true,
            freshness_score: 100,
            ...parsePatch(job),
          });
        }
      }
    }

    // Step 4: rebinds (per-row, count only on success).
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
      } else {
        updated++;
      }
    }

    // Step 5: two bulk upserts — one for updates, one for inserts. Counts
    // only advance for rows the DB actually accepted.
    updated += await applyBulkUpsert(supabase, toUpdateList, "update");
    inserted += await applyBulkUpsert(supabase, toInsertList, "insert");
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
