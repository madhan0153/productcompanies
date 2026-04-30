import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedJob } from "@prodmatch/shared";
import { log } from "../lib/logger.js";

export interface UpsertResult {
  inserted: number;
  updated: number;
  markedStale: number;
}

export async function upsertJobs(
  supabase: SupabaseClient,
  companyId: string,
  jobs: NormalizedJob[],
): Promise<{ inserted: number; updated: number }> {
  if (jobs.length === 0) return { inserted: 0, updated: 0 };

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  // Batch upsert by external_id (primary dedup key)
  const BATCH = 50;
  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);

    // Fetch existing external_ids for this company
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
        // Update existing row
        await supabase
          .from("jobs")
          .update({
            title: job.title,
            description: job.description,
            location: job.location,
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
          })
          .eq("id", found.id);
        updated++;
      } else {
        // Try signature fallback before inserting
        const { data: bySig } = await supabase
          .from("jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("signature", job.signature)
          .maybeSingle();

        if (bySig) {
          await supabase
            .from("jobs")
            .update({ external_id: job.external_id, last_seen_at: now, is_active: true })
            .eq("id", bySig.id);
          updated++;
        } else {
          const { error } = await supabase.from("jobs").insert({
            ...job,
            last_seen_at: now,
            is_active: true,
            freshness_score: 100,
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
  status: "success" | "partial" | "error";
  error: string | null;
}

export async function recordCrawlRun(
  supabase: SupabaseClient,
  payload: CrawlRunPayload,
): Promise<void> {
  const { error } = await supabase.from("crawl_runs").insert(payload);
  if (error) log(`Failed to record crawl_run: ${error.message}`, "warn");
}
