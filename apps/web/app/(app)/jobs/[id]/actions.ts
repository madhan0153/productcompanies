"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApplicationStatus } from "@/lib/supabase/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function trackJob(
  jobId: string,
  status: ApplicationStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("applications").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      status,
      applied_at: status === "applied" || status === "interviewing" || status === "offer"
        ? new Date().toISOString()
        : null,
    },
    { onConflict: "user_id,job_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2 — Items 9 + 10.
// Click → applied flow. Fires when user clicks "Apply on official site":
//   1. Atomically increments jobs.apply_click_count (intent signal).
//   2. Upserts an applications row with status='applied' so the role enters
//      the user's tracker without a separate manual step.
//   3. Idempotent — if the user already has a non-saved application for
//      this job, we skip the application upsert (preserves their notes /
//      interviewing status from being overwritten).
// ─────────────────────────────────────────────────────────────────────────────

export type RecordApplyResult =
  | { ok: true; created: boolean; alreadyTracked: boolean }
  | { ok: false; error: string };

export async function recordApplyClick(jobId: string): Promise<RecordApplyResult> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: "Invalid job id." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createSupabaseAdminClient();

  // 1. Atomic increment via raw SQL — keeps the counter correct under
  //    concurrent clicks without a SELECT-then-UPDATE race.
  //    Falls back silently on RPC missing (won't break apply flow).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcErr } = await (admin.rpc as any)("increment_apply_click_count", { job_uuid: jobId });
  if (rpcErr) {
    // Fallback: read-modify-write (rare; only if the migration RPC isn't present).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin
      .from("jobs")
      .select("apply_click_count")
      .eq("id", jobId)
      .maybeSingle() as any) as { data: { apply_click_count: number } | null };
    const next = (row?.apply_click_count ?? 0) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("jobs") as any)
      .update({ apply_click_count: next })
      .eq("id", jobId);
  }

  // 2. Application upsert. Only flip status to 'applied' when the row
  //    doesn't already exist OR is in 'saved' state. Don't trample
  //    interview / offer / rejected statuses the user maintains.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { id: string; status: ApplicationStatus } | null };

  let created = false;
  let alreadyTracked = false;
  if (!existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("applications") as any).insert({
      user_id: user.id,
      job_id: jobId,
      status: "applied",
      applied_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    created = true;
  } else if (existing.status === "saved") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("applications") as any)
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", existing.id);
    alreadyTracked = true;
  } else {
    alreadyTracked = true;
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true, created, alreadyTracked };
}

export async function untrackJob(
  appId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("applications")
    .delete()
    .eq("id", appId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
