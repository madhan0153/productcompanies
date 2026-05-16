"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { enqueueUserRecompute } from "@/lib/queue/recompute";

// Sprint 2 Item 5 — async match compute.
//
// Pre-Sprint-2 this was a synchronous server action: the client awaited the
// 30-90s compute, the matches page set `maxDuration = 300`, and users on
// flaky networks stared at a spinner-of-death. Now:
//
//   1. The action validates consent + resume, returns immediately with
//      { ok: true, queued: true }. No heavy work in the request path.
//   2. The actual compute runs in next/server's `after()` callback —
//      executes AFTER the HTTP response is flushed.
//   3. The client polls getLastMatchComputeAt() until the timestamp moves,
//      then router.refresh() pulls the new matches.
//
// Limits: `after()` runs in the same Vercel function invocation, so the
// platform maxDuration still applies. For a hobby/pro plan that's 60s,
// which fits the typical 5-25s compute window. The real queue (Inngest /
// Trigger.dev) is on the Sprint 3 plan.

export type ComputeMatchesResult =
  | { ok: true; queued: true; startedAt: string }
  | { ok: false; error: string };

export async function computeMatches(): Promise<ComputeMatchesResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return {
      ok: false,
      error: "Enable AI Matching consent in Settings → Privacy to use this feature.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_storage_path")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.resume_storage_path) {
    return { ok: false, error: "Upload your resume first to compute matches." };
  }

  const startedAt = new Date().toISOString();

  // Sprint 4 Item 13 — dispatch via the queue facade. Today this runs in
  // next/server's after(); swapping to Inngest later is a one-file change
  // (see lib/queue/recompute.ts).
  enqueueUserRecompute(user.id, { forceFull: true, source: "user_button" });

  return { ok: true, queued: true, startedAt };
}

// Tiny status-poll endpoint the client uses to detect when the background
// compute has finished. Cheap — one row, one column.
export async function getLastMatchComputeAt(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from("profiles")
    .select("last_match_compute_at")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { last_match_compute_at: string | null } | null };
  return data?.last_match_compute_at ?? null;
}

// Mark all currently-unseen matches as seen for this user. Called from the
// matches page after the initial render so the "New" pills disappear next
// load (the user has now seen them). Idempotent.
export async function markMatchesSeen(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("matches") as any)
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("seen_at", null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 1 — Item 4. Dismiss / restore flow.
// ─────────────────────────────────────────────────────────────────────────────
// User can hide any role from their default match list. Persisted on the
// matches row (user_hidden=true, hidden_at=now()). The default list query
// filters them out; a "Hidden" tab shows them with a Restore button.
//
// Why server actions and not a REST endpoint:
//   - Already authenticated via the Supabase SSR cookie session.
//   - revalidatePath gives an immediate, correct re-render on the matches
//     page without a roundtrip + client-state sync dance.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DismissResult = { ok: true } | { ok: false; error: string };

export async function dismissMatch(jobId: string): Promise<DismissResult> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: "Invalid job id." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("matches") as any)
    .update({ user_hidden: true, hidden_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("job_id", jobId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/matches");
  return { ok: true };
}

export async function restoreMatch(jobId: string): Promise<DismissResult> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: "Invalid job id." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("matches") as any)
    .update({ user_hidden: false, hidden_at: null })
    .eq("user_id", user.id)
    .eq("job_id", jobId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/matches");
  return { ok: true };
}
