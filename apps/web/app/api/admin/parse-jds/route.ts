// POST /api/admin/parse-jds
//
// Phase G — backfill structured JD parse for jobs missing it. Idempotent and
// resumable: it picks up where it left off on every invocation. Designed to
// run as a Vercel Cron job once per day OR manually after a fresh crawl.
//
// Auth: Bearer $CRON_SECRET (same pattern as /api/cron/digest and
// /api/admin/backfill-jobs).
//
// Each batch processes up to 25 jobs; cap on Vercel Pro is maxDuration:300s.
// One Gemini light-tier call per job (~₹0). Stamps:
//   must_have_skills, nice_to_have_skills, jd_min_years, jd_max_years,
//   work_mode, jd_seniority_signal, jd_summary, jd_parsed_at,
//   is_likely_ghost, ghost_signals
//
//   curl -X POST https://prodmatchai.vercel.app/api/admin/parse-jds \
//     -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { parseJobDescription } from "@/lib/llm/prompts/jd-parse";
import { detectGhost } from "@/lib/matching/ghost";
import { LlmRunError } from "@/lib/llm/gemini";
import type { Json, SeniorityLevel } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BATCH_LIMIT = 25;

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  seniority: SeniorityLevel | null;
  posted_at: string | null;
  last_seen_at: string | null;
};

export async function POST(req: NextRequest) {
  const cronSecret = serverEnv.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Pull a batch of unparsed active jobs. The partial index
  // idx_jobs_unparsed makes this O(log n) regardless of total job count.
  const { data: jobs, error } = await admin
    .from("jobs")
    .select("id, title, description, seniority, posted_at, last_seen_at")
    .eq("is_active", true)
    .is("jd_parsed_at", null)
    .not("description", "is", null)
    .limit(BATCH_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const batch = (jobs as JobRow[] | null) ?? [];
  if (batch.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, remaining: 0, message: "All jobs parsed." });
  }

  const errors: Array<{ id: string; reason: string }> = [];
  let processed = 0;
  let ghostCount = 0;

  for (const job of batch) {
    if (!job.description || job.description.length < 60) {
      // Mark as parsed with no signal so we don't retry forever.
      await admin
        .from("jobs")
        .update({
          jd_parsed_at: new Date().toISOString(),
          must_have_skills: [],
          nice_to_have_skills: [],
          ghost_signals: { reason: "description_too_short" } as Json,
        })
        .eq("id", job.id);
      continue;
    }

    try {
      const parsed = await parseJobDescription({
        title: job.title,
        description: job.description,
        seniority_hint: job.seniority,
      });

      const ghost = detectGhost({
        posted_at: job.posted_at,
        last_seen_at: job.last_seen_at,
        is_boilerplate: parsed.is_boilerplate,
        ghost_reasons: parsed.ghost_reasons,
        must_have_skills: parsed.must_have_skills,
      });

      if (ghost.is_likely_ghost) ghostCount++;

      const { error: upErr } = await admin
        .from("jobs")
        .update({
          must_have_skills:    parsed.must_have_skills,
          nice_to_have_skills: parsed.nice_to_have_skills,
          jd_min_years:        parsed.jd_min_years,
          jd_max_years:        parsed.jd_max_years,
          work_mode:           parsed.work_mode,
          jd_seniority_signal: parsed.jd_seniority_signal,
          jd_summary:          parsed.jd_summary,
          is_likely_ghost:     ghost.is_likely_ghost,
          ghost_signals:       ghost.signals as unknown as Json,
          jd_parsed_at:        new Date().toISOString(),
        })
        .eq("id", job.id);

      if (upErr) {
        errors.push({ id: job.id, reason: upErr.message });
        continue;
      }

      processed++;
    } catch (err) {
      const reason = err instanceof LlmRunError
        ? `llm_${err.detail.kind}`
        : err instanceof Error ? err.message : String(err);
      errors.push({ id: job.id, reason });
      // Don't stamp jd_parsed_at on LLM failures — let it retry on the next run.
    }
  }

  // Count remaining for the caller.
  const { count: remaining } = await admin
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .is("jd_parsed_at", null);

  return NextResponse.json({
    ok: true,
    processed,
    ghost_flagged: ghostCount,
    errors: errors.length,
    error_samples: errors.slice(0, 5),
    remaining: remaining ?? 0,
  });
}
