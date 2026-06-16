"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/billing/entitlements";
import { dsaQuota } from "@/lib/dsa/quotas";
import {
  markSolved,
  skipToday,
  freezeStreak,
  unlockApproach,
} from "@/lib/dsa/daily";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function markSolvedAction(
  slug: string,
): Promise<{ ok: boolean; current: number; longest: number; alreadySolved: boolean }> {
  const user = await requireUser();
  if (!user) return { ok: false, current: 0, longest: 0, alreadySolved: false };
  const { plan } = await getEntitlements(user.id);
  const res = await markSolved(user.id, plan, slug);
  revalidatePath("/dsa");
  return { ok: true, ...res };
}

export async function skipTodayAction(
  slug: string,
): Promise<{ ok: boolean; remaining: number }> {
  const user = await requireUser();
  if (!user) return { ok: false, remaining: 0 };
  const { plan } = await getEntitlements(user.id);
  const res = await skipToday(user.id, plan, slug);
  revalidatePath("/dsa");
  return res;
}

export async function freezeTodayAction(
  slug: string,
): Promise<{ ok: boolean; remaining: number }> {
  const user = await requireUser();
  if (!user) return { ok: false, remaining: 0 };
  const { plan } = await getEntitlements(user.id);
  const res = await freezeStreak(user.id, plan, slug);
  revalidatePath("/dsa");
  return res;
}

/**
 * Reveal the full approach + solution steps. Pro/Sprint are always entitled.
 * Free users spend one of their monthly credits; if exhausted, the content is
 * withheld and the caller shows the upgrade path. The gated strings are only
 * ever returned from this server action — never embedded in the initial page.
 *
 * A credit is charged ONLY when (a) the question actually exists & is live and
 * (b) the user has not already unlocked this exact question. Fetching the
 * content first means an invalid slug never burns a credit, and per-question
 * dedup means navigating back to an already-unlocked question is free.
 */
export async function revealApproachAction(slug: string): Promise<
  | { ok: true; approach: string[]; solutionSteps: string[]; remaining: number | "unlimited" }
  | { ok: false; reason: "auth" | "exhausted" | "unavailable" }
> {
  const user = await requireUser();
  if (!user) return { ok: false, reason: "auth" };
  const { plan } = await getEntitlements(user.id);

  // Validate the content BEFORE charging anything. A missing/unpublished slug
  // must never consume a credit.
  const admin = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await admin
    .from("dsa_questions")
    .select("approach, solution_steps")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  if (!data) return { ok: false, reason: "unavailable" };

  // Spend (or skip, for unlimited plans / already-unlocked questions). The
  // returned `remaining` is the actual post-spend count so the client updates
  // its counter inline without a round-trip.
  const unlock = await unlockApproach(user.id, plan, slug);
  if (!unlock.ok) return { ok: false, reason: "exhausted" };

  const approach = (data.approach as string[] | undefined) ?? [];
  const solutionSteps = (data.solution_steps as string[] | undefined) ?? [];

  // Refresh both the hub statcard (full-approach credits remaining) and the
  // detail page (so a back-nav doesn't show a stale "Reveal" CTA).
  revalidatePath("/dsa");
  revalidatePath(`/dsa/${slug}`);

  return {
    ok: true,
    approach,
    solutionSteps,
    remaining: unlock.remaining,
  };
}

/**
 * Reveal the Java/C++ solutions. Hard-gated: only Pro/Sprint receive the
 * strings. Free users get an upgrade prompt from the client and never the code.
 */
export async function revealSolutionLangsAction(
  slug: string,
): Promise<{ ok: boolean; java: string; cpp: string }> {
  const user = await requireUser();
  if (!user) return { ok: false, java: "", cpp: "" };
  const { plan } = await getEntitlements(user.id);
  if (!dsaQuota(plan).langs.includes("java")) return { ok: false, java: "", cpp: "" };

  const admin = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
  const { data } = await admin
    .from("dsa_questions")
    .select("code_java, code_cpp")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  return { ok: true, java: (data?.code_java as string) ?? "", cpp: (data?.code_cpp as string) ?? "" };
}
