"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { enqueueUserRecompute } from "@/lib/queue/recompute";
import { createDurableJob, assertNoSupabaseError } from "@/lib/jobs/state";
import { getResumeReadinessForCompute } from "@/lib/resume/readiness";

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
      error: "Enable AI Matching consent in Settings -> Privacy to use this feature.",
    };
  }

  const admin = createSupabaseAdminClient();
  const readiness = await getResumeReadinessForCompute(admin, user.id);
  if (!readiness.ready || !readiness.activeResumeVersionId) {
    return { ok: false, error: readiness.message };
  }

  const startedAt = new Date().toISOString();
  let job;
  try {
    job = await createDurableJob(admin, {
      userId: user.id,
      type: "match_compute",
      resumeVersionId: readiness.activeResumeVersionId,
      source: "user_button",
    });
  } catch {
    return { ok: false, error: "A match computation is already running for this resume." };
  }

  enqueueUserRecompute(user.id, {
    forceFull: true,
    source: "user_button",
    resumeVersionId: readiness.activeResumeVersionId,
    jobId: job.id,
  });

  return { ok: true, queued: true, startedAt };
}

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

export async function markMatchesSeen(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("matches") as any)
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("seen_at", null);
  assertNoSupabaseError(error, "Could not mark matches as seen");
}

// Dismiss / restore flow removed. All matches stay visible; users use tabs and
// filters to focus the list. The `user_hidden` column remains for feedback.
