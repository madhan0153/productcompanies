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

    const externalIds = batch.map((j) => j.external_id);
    const { data: existing } = await supabase
      .from("jobs")
      .select("id, external_id, signature")
      .eq("company_id", companyId)
      .in("external_id", externalIds);

    const existingMap = new Map((existing ?? []).map((r) => [r.external_id, r]));

    for (const job of batch) {
      const found = existingMap.get(job.external_id);
      if (found) {
        await supabase
          .from("jobs")
          .update({
            title: job.title,
            description: job.description,
            location: job.location,
            apply_url: job.apply_url,
            hubs: job.hubs,
            tech_stack: job.tech_stack,
            seniority: job.seniority,
            min_experience_years: job.min_experience_years,
            max_experience_years: job.max_experience_years,
            comp_lpa_min: job.comp_lpa_min,
            comp_lpa_max: job.comp_lpa_max,
            last_seen_at: now,
            is_active: true,
            raw: job.raw,
            ...parsePatch(job),
          })
          .eq("id", found.id);
        updated++;
      } else {
        const { data: bySig } = await supabase
          .from("jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("signature", job.signature)
          .maybeSingle();

        if (bySig) {
          await supabase
            .from("jobs")
            .update({
              external_id: job.external_id,
              apply_url: job.apply_url,
              description: job.description,
              last_seen_at: now,
              is_active: true,
              ...parsePatch(job),
            })
            .eq("id", bySig.id);
          updated++;
        } else {
          // Strip the EnrichedJob-only fields before insert (they aren't
          // columns). parsePatch handles structured-parse + embedding.
          const { parsed: _p, embedding: _e, needsParse: _n, ...row } = job;
          void _p; void _e; void _n;
          const { error } = await supabase.from("jobs").insert({
            ...row,
            last_seen_at: now,
            is_active: true,
            freshness_score: 100,
            ...parsePatch(job),
          });
          if (error) {
            log(`Insert error for job ${job.external_id}: ${error.message}`, "warn");
          } else {
            inserted++;
          }
        }
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
