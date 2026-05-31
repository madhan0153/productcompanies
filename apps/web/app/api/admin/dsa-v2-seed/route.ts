// DSA v2 — repo bank → DB seed.
//
// Idempotently upserts every question from packages/shared/src/dsa-v2/bank.ts
// into the public.dsa_questions table. The status field on existing rows
// is PRESERVED — admin approvals are never reverted by a re-seed. Only the
// content fields are refreshed if the author updates a question's text.
//
// Auth: admin-only (requireAdmin). Method: GET (also POST) so it can be
// triggered from a sidebar link in /admin/content. Idempotent — safe to
// hit multiple times.

import { NextRequest, NextResponse } from "next/server";
import { DSA_V2_BANK } from "@prodmatch/shared";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest)  { return runSeed(req); }
export async function POST(req: NextRequest) { return runSeed(req); }

async function runSeed(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "admin_dsa_seed_ip", { limit: 20, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const gate = await requireAdmin();
  if (!gate.isAdmin) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  const adminLimit = await rateLimitRoute(req, "admin_dsa_seed", {
    limit: 10,
    windowMs: 10 * 60_000,
    userId: gate.userId,
  });
  if (adminLimit) return adminLimit;

  const admin = createSupabaseAdminClient();

  // 1. Read existing rows to preserve status on already-reviewed questions.
  const { data: existingRows, error: readError } = (await admin
    .from("dsa_questions")
    .select("slug, status, reviewed_by, reviewed_at, rejection_reason, internal_notes")) as unknown as {
      data: Array<{
        slug: string;
        status: string;
        reviewed_by: string | null;
        reviewed_at: string | null;
        rejection_reason: string | null;
        internal_notes: string | null;
      }> | null;
      error: { message: string } | null;
    };
  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  }
  const existingBySlug = new Map((existingRows ?? []).map((r) => [r.slug, r]));

  // 2. Build the upsert payload, preserving review state on existing slugs.
  const payload = DSA_V2_BANK.map((q) => {
    const existing = existingBySlug.get(q.slug);
    return {
      slug:               q.slug,
      version:            q.version,
      status:             existing?.status ?? q.status,
      pattern:            q.pattern,
      difficulty:         q.difficulty,
      primary_role:       q.primaryRole,
      roles:              q.roles,
      bucket:             q.bucket,
      batch_no:           q.batchNo,
      title:              q.title,
      framing:            q.framing,
      statement:          q.statement,
      input_format:       q.inputFormat,
      output_format:      q.outputFormat,
      constraints:        q.constraints,
      examples:           q.examples,
      approach:           q.approach,
      solution_steps:     q.solutionSteps,
      code_python:        q.code.python,
      code_java:          q.code.java,
      code_cpp:           q.code.cpp,
      complexity_time:    q.complexity.time,
      complexity_space:   q.complexity.space,
      pitfalls:           q.pitfalls,
      edge_cases:         q.edgeCases,
      why_it_matters:     q.whyItMatters,
      estimated_minutes:  q.estimatedMinutes,
      authored_by:        "claude-opus-4-7",
      reviewed_by:        existing?.reviewed_by ?? null,
      reviewed_at:        existing?.reviewed_at ?? null,
      rejection_reason:   existing?.rejection_reason ?? null,
      internal_notes:     existing?.internal_notes ?? null,
      updated_at:         new Date().toISOString(),
    };
  });

  // 3. Upsert by slug. ON CONFLICT (slug) DO UPDATE for content fields,
  //    preserving review state via the values we pulled from existing.
  const { error: writeError, count } = await admin
    .from("dsa_questions")
    .upsert(payload as never, { onConflict: "slug", count: "exact" });

  if (writeError) {
    return NextResponse.json({ ok: false, error: writeError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    seeded: count ?? payload.length,
    preserved: existingBySlug.size,
    bank: payload.length,
  });
}
