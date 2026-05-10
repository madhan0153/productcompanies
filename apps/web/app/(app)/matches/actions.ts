"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeMatchesForUser } from "@/lib/matching/engine";
import { getUserConsents } from "@/lib/dpdp/consent";

export type ComputeMatchesResult =
  | {
      ok: true;
      total: number;
      new_matches: number;
      skipped: number;
      ghost_filtered: number;
      with_fit_card: number;
      unparsed_jobs: number;
      mode: "full" | "incremental";
    }
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

  try {
    // Manual button = force full recompute. Daily cron uses incremental.
    const result = await computeMatchesForUser(user.id, { forceFull: true });
    revalidatePath("/matches");
    revalidatePath("/dashboard");
    return {
      ok: true,
      total:           result.total,
      new_matches:     result.new_matches,
      skipped:         result.skipped,
      ghost_filtered:  result.ghost_filtered,
      with_fit_card:   result.with_fit_card,
      unparsed_jobs:   result.unparsed_jobs,
      mode:            result.mode,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
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
