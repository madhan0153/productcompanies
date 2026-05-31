// POST /api/admin/parse-jds
//
// SAFETY NET — the crawler now parses JDs inline at ingest. This endpoint
// only catches the rare row whose inline parse failed (e.g. all keys
// exhausted in a single run) or is a legacy row from before Phase J.
//
// Auth: Bearer $CRON_SECRET.
//
// Tight loop: small batch + 250s wall-clock guard. Even if Gemini stalls,
// we return whatever was processed so the workflow's "until remaining=0"
// loop sees forward progress and re-invokes cleanly.
//
//   curl -X POST https://prodmatchai.vercel.app/api/admin/parse-jds \
//     -H "Authorization: Bearer $CRON_SECRET"

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseJobDescription } from "@/lib/llm/prompts/jd-parse";
import { detectGhost } from "@/lib/matching/ghost";
import { LlmRunError } from "@/lib/llm/gemini";
import { embed, buildJobEmbedText } from "@/lib/llm/embed";
import type { Json, SeniorityLevel } from "@/lib/supabase/types";
import { requireCronAuth } from "@/lib/security/cron";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import { logEvent } from "@/lib/observability/log";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Smaller batch + wall-clock guard. Each parse + embed averages 3-6s with
// retries; 8 jobs leaves headroom under 250s for occasional 429 backoff.
const BATCH_LIMIT = 8;
const WALL_CLOCK_BUDGET_MS = 250_000;

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  seniority: SeniorityLevel | null;
  posted_at: string | null;
  last_seen_at: string | null;
};

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "admin_parse_jds_ip", { limit: 12, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const admin = createSupabaseAdminClient();
  const startedAt = Date.now();

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
  let bailed = false;

  for (const job of batch) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
      bailed = true;
      break;
    }

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
      processed++;
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

      // Embed the (now-structured) JD. Soft-fail on quota — parse stamp
      // still lands; embedding gets backfilled on the next pass.
      let embedding: number[] | null = null;
      try {
        embedding = await embed(buildJobEmbedText({
          title: job.title,
          jd_summary: parsed.jd_summary,
          must_have_skills: parsed.must_have_skills,
          nice_to_have_skills: parsed.nice_to_have_skills,
          description: job.description ?? undefined,
          jd_seniority_signal: parsed.jd_seniority_signal,
          role_function: parsed.role_function_jd,
          responsibilities: parsed.responsibilities,
          team_context: parsed.team_context,
        }), "job_embedding");
      } catch (embedErr) {
        if (errors.length < 5) {
          logEvent("warn", "admin_parse_jd_embed_failed", {
            job_id: job.id,
            error: embedErr instanceof Error ? embedErr.name : "unknown",
          });
        }
      }

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
          role_function_jd:        parsed.role_function_jd,
          responsibilities:        parsed.responsibilities,
          qualifications_required: parsed.qualifications_required,
          qualifications_preferred: parsed.qualifications_preferred,
          tech_stack_explicit:     parsed.tech_stack_explicit,
          team_context:            parsed.team_context,
          jd_parsed_at:        new Date().toISOString(),
          ...(embedding && embedding.length > 0
            ? { embedding, embedding_at: new Date().toISOString() }
            : {}),
        } as any)
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
    }
  }

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
    bailed_on_budget: bailed,
    elapsed_ms: Date.now() - startedAt,
  });
}
