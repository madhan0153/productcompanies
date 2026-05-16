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
// Sprint 2 + 3 — Items 9, 10, 15.
// Click → applied flow. Fires when user clicks "Apply on official site":
//   1. Read the user's existing application row.
//   2. If a click happened in the last DEBOUNCE_MS window, return without
//      incrementing or touching state. This is the Item-15 debounce —
//      stops a double-tap (or impatient reload) from inflating the counter
//      and from churning revalidatePath.
//   3. Atomically increments jobs.apply_click_count (intent signal).
//   4. Upserts an applications row with status='applied' so the role enters
//      the user's tracker without a separate manual step.
//   5. Idempotent on status — never trample interview / offer / rejected
//      statuses the user maintains.
// ─────────────────────────────────────────────────────────────────────────────

// Sprint 3 Item 15 — minimum gap between counted clicks per (user, job).
// One minute is the right scale: catches the "double-click on the button",
// the "browser refresh while the new tab was loading", and the "I closed
// the tab and re-clicked to reopen" case — all of which are one *intent*.
const APPLY_DEBOUNCE_MS = 60_000;

export type RecordApplyResult =
  | { ok: true; created: boolean; alreadyTracked: boolean; debounced: boolean }
  | { ok: false; error: string };

export async function recordApplyClick(jobId: string): Promise<RecordApplyResult> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: "Invalid job id." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createSupabaseAdminClient();

  // 1. Read existing application row first — this drives BOTH the debounce
  //    decision (Item 15) and the status-update decision below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase
    .from("applications")
    .select("id, status, applied_at")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { id: string; status: ApplicationStatus; applied_at: string | null } | null };

  // 2. Debounce — within the window, return without writing. The user has
  //    already been counted; opening the apply URL again happens on the
  //    client (we don't try to re-open from the server).
  const now = Date.now();
  const debounced =
    existing?.applied_at != null &&
    now - new Date(existing.applied_at).getTime() < APPLY_DEBOUNCE_MS;
  if (debounced) {
    return { ok: true, created: false, alreadyTracked: true, debounced: true };
  }

  // 3. Atomic increment via raw SQL — keeps the counter correct under
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
    const nextCount = (row?.apply_click_count ?? 0) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("jobs") as any)
      .update({ apply_click_count: nextCount })
      .eq("id", jobId);
  }

  // 4. Application upsert. Only flip status to 'applied' when the row
  //    doesn't already exist OR is in 'saved' state. Don't trample
  //    interview / offer / rejected statuses the user maintains.
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
  return { ok: true, created, alreadyTracked, debounced: false };
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
