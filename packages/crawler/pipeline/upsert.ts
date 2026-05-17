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
  const { parsed: _p, embedding: _e, needsParse: _n, quality: _q, ...row } = job;
  void _p; void _e; void _n; void _q;
  return row;
}

// Sprint 6 — Quality columns patch. Always written when the crawler evaluated
// quality for this row (i.e. quality is set). Stamping quality_gated_at lets
// the matching engine distinguish "never evaluated" (legacy) from "currently
// fine" (high quality_score). Idempotent — applied on every upsert path.
function qualityPatch(job: EnrichedJob): Record<string, unknown> {
  if (!job.quality) return {};
  return {
    quality_score:    job.quality.score,
    quality_reasons:  job.quality.reasons,
    quality_gated_at: new Date().toISOString(),
  };
}

/**
 * Remove `signature` from a row payload — used when an UPDATE row's new
 * signature would collide with another row's existing signature. The row's
 * other fields (last_seen_at, description, parse data, etc.) still update;
 * only the sig stays at its current DB value. This avoids 23505 violations
 * without losing the freshness/parse data that the crawl produced.
 */
function stripSignature(row: Record<string, unknown>): Record<string, unknown> {
  const { signature: _s, ...rest } = row;
  void _s;
  return rest;
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

/**
 * Recognize signature-collision errors. When two distinct external_ids carry
 * identical content (same title+location+description hash), the second
 * insert violates ux_jobs_company_signature. We treat these as "an existing
 * row already represents this content" — silent skip rather than an alert.
 */
function isSignatureCollision(msg: string): boolean {
  return /ux_jobs_company_signature/.test(msg);
}

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

  // Signature collision in a bulk insert poisons the whole batch in PG.
  // Fall back to per-row so the OTHER rows in the batch can still land.
  // Note: the in-process signature reconciliation in upsertJobs() should
  // prevent these now, so a sig collision arriving here means we hit an
  // unexpected edge case (concurrent writes, eventual consistency, etc.).
  // Logged at info-level since per-row recovery handles it cleanly.
  const isSigCollision = isSignatureCollision(error.message);
  log(
    `Bulk ${kindLabel} failed: ${error.message} — falling back to per-row`,
    isSigCollision ? "info" : "warn",
    { event: "bulk_upsert_error", data: { kind: kindLabel, batchSize: rows.length, error: error.message, sigCollision: isSigCollision } },
  );

  // Per-row recovery so a single bad row doesn't sink the whole batch.
  let ok = 0;
  let sigSkipped = 0;
  for (const row of rows) {
    const { error: e2 } = await supabase
      .from("jobs")
      .upsert(row, { onConflict: CONFLICT_TARGET, ignoreDuplicates: false });
    if (e2) {
      if (isSignatureCollision(e2.message)) {
        // Silent skip — an existing row at this signature already represents
        // this content. Not a real failure.
        sigSkipped++;
      } else {
        log(
          `Per-row ${kindLabel} failed for external_id=${(row as { external_id?: string }).external_id}: ${e2.message}`,
          "warn",
          { event: "row_upsert_error", data: { kind: kindLabel, error: e2.message } },
        );
      }
    } else {
      ok++;
    }
  }
  log(
    `Per-row recovery: ${ok}/${rows.length} ${kindLabel}s succeeded` +
    (sigSkipped > 0 ? ` (skipped ${sigSkipped} signature-collisions)` : ""),
    "info",
    { event: "bulk_upsert_recovered", data: { kind: kindLabel, recovered: ok, total: rows.length, sigSkipped } },
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
    const existingExt = new Map<string, { id: string; external_id: string; signature: string }>(
      (byExt ?? []).map((r) => [r.external_id as string, { id: r.id as string, external_id: r.external_id as string, signature: r.signature as string }]),
    );

    // Step 2: lookup by signature — ALL target signatures the batch plans
    // to write, not just unmatched-by-external_id rows. This is the bug
    // that kept tripping ux_jobs_company_signature: we used to only fetch
    // sigs for new rows, but UPDATE rows (whose content changed) also
    // re-write their signature, and that new sig could already belong to
    // ANOTHER existing row. Without checking, the bulk update collided.
    const allTargetSigs = [...new Set(batch.map((j) => j.signature))];
    let sigOwnerByExt = new Map<string, { id: string; external_id: string }>();
    if (allTargetSigs.length > 0) {
      const { data: sigOwners, error: sigErr } = await supabase
        .from("jobs")
        .select("id, external_id, signature")
        .eq("company_id", companyId)
        .in("signature", allTargetSigs);
      if (sigErr) {
        log(`upsert lookup-by-sig error: ${sigErr.message}`, "warn", { event: "upsert_lookup_error", data: { error: sigErr.message } });
      }
      sigOwnerByExt = new Map(
        (sigOwners ?? []).map((r) => [r.signature as string, { id: r.id as string, external_id: r.external_id as string }]),
      );
    }

    // Step 3: partition by intent AND by column shape, with
    // signature-conflict reconciliation done IN-PROCESS so the bulk
    // call never sees a collision.
    //
    // Why "column shape"? Supabase / PostgREST bulk upsert collects the
    // UNION of keys across all rows in the array. If some rows include
    // `must_have_skills` (because they were re-parsed) and others don't,
    // PostgREST includes the column for every row — and fills NULL where
    // it wasn't supplied. The NOT NULL DEFAULT '{}' constraint then
    // rejects the whole batch. Fix: split into uniform-shape sub-batches
    // BEFORE the call. Each sub-batch has identical keys → no NULL fill.
    //
    // The same union-of-keys behaviour bites a third dimension: SIGNATURE.
    // When the pre-emption code below decides a row's target sig would
    // collide, it strips `signature` from the payload so the existing DB
    // value is preserved. But if that stripped row sits in the same bulk
    // array as a "normal" row that DOES have `signature`, PostgREST unions
    // → adds signature: null to the stripped row → "null in NOT NULL
    // column 'signature'" violation. Fix: stripped-sig rows are NEVER
    // batched. They get applied per-row through a dedicated update path
    // that doesn't include the signature column at all.
    const toRebind: Array<{ rowId: string; job: EnrichedJob }> = [];
    const toUpdateWithParse: Record<string, unknown>[] = [];
    const toUpdateNoParse:   Record<string, unknown>[] = [];
    const toUpdateStrippedSig: Array<{ rowId: string; payload: Record<string, unknown> }> = [];
    const toInsertWithParse: Record<string, unknown>[] = [];
    const toInsertNoParse:   Record<string, unknown>[] = [];

    // Tracks which sigs will be "claimed" by some row in this batch after
    // it lands. Prevents two rows in the same batch from racing to the
    // same target sig (one would land, the other would 23505).
    const claimedSigs = new Set<string>();
    let droppedSigConflicts = 0;
    let strippedSigOnUpdate = 0;

    for (const job of batch) {
      const baseRow = {
        ...asRow(job),
        ...qualityPatch(job),
        last_seen_at: now,
        is_active: true,
        freshness_score: 100,
      };
      const patch = parsePatch(job);
      const hasParse = Object.keys(patch).length > 0;

      const dbOwnerOfTargetSig = sigOwnerByExt.get(job.signature);
      const existing = existingExt.get(job.external_id);

      if (existing) {
        // UPDATE path: this row's external_id is in DB.
        //   - If existing.signature === job.signature: trivial no-op on sig.
        //   - If target sig is owned by another DB row OR claimed by an
        //     earlier batch row: strip `signature` from the payload AND
        //     route to the per-row stripped-sig path (NOT the bulk array),
        //     so PostgREST can't union-fill signature: null.
        //   - Else: claim the new sig and ride the bulk path.
        const wouldCollide =
          existing.signature !== job.signature &&
          (
            (dbOwnerOfTargetSig != null && dbOwnerOfTargetSig.id !== existing.id) ||
            claimedSigs.has(job.signature)
          );

        if (wouldCollide) {
          strippedSigOnUpdate++;
          // Existing sig stays in DB; don't claim a new one. Send to the
          // per-row updater keyed by the existing row id, so we can use
          // .update().eq("id", id) — the column-union trap doesn't apply
          // to single-row updates.
          const stripped = stripSignature({ ...baseRow, ...patch });
          // external_id never changes on this path (we're keying by id),
          // but stripping it from the payload keeps the update narrow.
          const { external_id: _ext, company_id: _cid, ...patchOnly } = stripped;
          void _ext; void _cid;
          toUpdateStrippedSig.push({ rowId: existing.id, payload: patchOnly });
        } else {
          claimedSigs.add(job.signature);
          const row = { ...baseRow, ...patch };
          if (hasParse) toUpdateWithParse.push(row);
          else          toUpdateNoParse.push(row);
        }
      } else {
        // INSERT path: this row's external_id is NOT in DB.
        // Order matters: check claimedSigs FIRST so two batch rows
        // wanting to rebind to the same DB row don't both attempt it.
        if (claimedSigs.has(job.signature)) {
          // Some earlier action in this batch already represents this
          // content (fresh insert, rebind, or an update keeping the same
          // sig). Drop this row — it'd just collide.
          droppedSigConflicts++;
        } else if (dbOwnerOfTargetSig) {
          // Target sig already owned by some other row → REBIND
          // (UPDATE that row with this row's external_id + new content).
          toRebind.push({ rowId: dbOwnerOfTargetSig.id, job });
          claimedSigs.add(job.signature);
        } else {
          claimedSigs.add(job.signature);
          if (hasParse) toInsertWithParse.push({ ...baseRow, ...patch });
          else          toInsertNoParse.push(baseRow);
        }
      }
    }

    if (droppedSigConflicts > 0) {
      log(
        `upsert: dropped ${droppedSigConflicts} in-batch duplicate(s) (same content, different external_id)`,
        "info",
        { event: "upsert_sig_dup", data: { dropped: droppedSigConflicts, batchSize: batch.length } },
      );
    }
    if (strippedSigOnUpdate > 0) {
      log(
        `upsert: kept ${strippedSigOnUpdate} update(s) with sig unchanged (target sig owned by another row)`,
        "info",
        { event: "upsert_sig_stripped", data: { stripped: strippedSigOnUpdate, batchSize: batch.length } },
      );
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
          ...qualityPatch(job),
          ...parsePatch(job),
        })
        .eq("id", rowId);
      if (error) {
        log(`Rebind error for ${job.external_id}: ${error.message}`, "warn", { event: "rebind_error", data: { error: error.message } });
      } else {
        updated++;
      }
    }

    // Step 5: four bulk upserts — one per (kind × shape) combination.
    // Each has uniform column shape; PostgREST won't NULL-fill missing
    // keys, so the bulk path succeeds first try in the steady state.
    updated  += await applyBulkUpsert(supabase, toUpdateWithParse, "update");
    updated  += await applyBulkUpsert(supabase, toUpdateNoParse,   "update");
    inserted += await applyBulkUpsert(supabase, toInsertWithParse, "insert");
    inserted += await applyBulkUpsert(supabase, toInsertNoParse,   "insert");

    // Step 6: stripped-sig rows go per-row through `.update().eq("id", …)`.
    // PostgREST's column-union behaviour does NOT apply to a single-row
    // update, so the absence of `signature` in the payload simply means
    // "don't touch that column" — exactly what we want.
    for (const { rowId, payload } of toUpdateStrippedSig) {
      const { error } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", rowId);
      if (error) {
        log(
          `Stripped-sig update failed for row=${rowId}: ${error.message}`,
          "warn",
          { event: "stripped_sig_update_error", data: { rowId, error: error.message } },
        );
      } else {
        updated++;
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
