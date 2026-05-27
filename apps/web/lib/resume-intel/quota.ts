// Resume Intelligence — per-user quota enforcement.
//
// Reads from public.resume_intel_events to count diagnosis runs in the last
// 30 days. The DB column is RLS-scoped to the owner so a service-role read
// here is intentional (server actions only).
//
// Chosen quotas (per decision in BUILD_SPEC_RESUME_INTELLIGENCE §14):
//   • Enhanced Resume:   5 diagnoses per 30 days per user
//   • Tailored Resume:   30 diagnoses per 30 days per user
//
// Finalise / discard actions do NOT consume quota — only the LLM-spending
// diagnosis call does. A user can review a pending diagnosis any number of
// times without incurring further quota.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/billing/entitlements";

const WINDOW_DAYS = 30;

export const QUOTA = {
  enhanced: 0,
  tailored: 5,
} as const;

export type QuotaScope = keyof typeof QUOTA;

export interface QuotaState {
  scope: QuotaScope;
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp when the oldest counted event ages out and a slot reopens. */
  resets_at: string | null;
  exhausted: boolean;
}

export async function getQuotaState(
  userId: string,
  scope: QuotaScope,
): Promise<QuotaState> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();


  const { data, error } = await (admin
    .from("resume_intel_events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("scope", scope)
    .eq("kind", "diagnosis")
    .eq("ok", true)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(100) as any) as { data: Array<{ created_at: string }> | null; error: unknown };

  if (error) {
    // Fail open with zero usage — we never want a telemetry table outage
    // to lock the entire feature. The LLM-side rate limiter still applies.
    return {
      scope,
      limit: QUOTA[scope],
      used: 0,
      remaining: QUOTA[scope],
      resets_at: null,
      exhausted: false,
    };
  }

  const used = data?.length ?? 0;
  const entitlement = scope === "tailored" ? await getEntitlements(userId) : null;
  const limit = entitlement?.tailoredResumeLimit ?? QUOTA[scope];
  const oldest = data && data.length > 0 ? data[0].created_at : null;
  const resets_at = oldest
    ? new Date(new Date(oldest).getTime() + WINDOW_DAYS * 86_400_000).toISOString()
    : null;

  return {
    scope,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resets_at,
    exhausted: used >= limit,
  };
}

/** Human-friendly "in N days" hint for quota-exhausted UX. */
export function resetsInHumanForm(resets_at: string | null): string {
  if (!resets_at) return "soon";
  const diff = new Date(resets_at).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "soon";
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 1) return "tomorrow";
  if (days <= 7) return `in ${days} days`;
  return `in ${days} days`;
}
