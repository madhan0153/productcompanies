import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "./entitlements";
import { getCreditBalance } from "./credits";
import { PLAN_LIMITS, type BillingPlan } from "./catalog";

const WINDOW_DAYS = 30;
const WINDOW_MS   = WINDOW_DAYS * 86_400_000;

export interface UsageMetric {
  key:        "tailored" | "matches" | "reparses" | "recomputes";
  label:      string;
  used:       number;
  limit:      number;
  remaining:  number;
  unlimited:  boolean;
  exhausted:  boolean;
  resetsAt:   string | null;
}

export interface UserUsage {
  plan:       BillingPlan;
  activeUntil: string | null;
  metrics:    UsageMetric[];
  credits: {
    tailored:   number;
    reparse:    number;
    recompute:  number;
  };
}

/**
 * Returns a normalised view of one user's usage and entitlement state.
 * Used by the user-facing /settings/billing page, the in-app usage chip,
 * and the admin user-detail page.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const admin   = createSupabaseAdminClient();
  const since   = new Date(Date.now() - WINDOW_MS).toISOString();
  const entitle = await getEntitlements(userId);
  const limits  = PLAN_LIMITS[entitle.plan];

  // Parallel fan-out: each counter is a head-count query, cheap
  const [tailoredResp, matchesResp, reparsesResp, recomputesResp,
         tailoredCredits, reparseCredits, recomputeCredits] = await Promise.all([
    admin.from("resume_intel_events").select("created_at", { count: "exact", head: false })
         .eq("user_id", userId).eq("scope", "tailored").eq("kind", "diagnosis").eq("ok", true)
         .gte("created_at", since).order("created_at", { ascending: true }).limit(120) as any,
    admin.from("matches").select("seen_at", { count: "exact", head: false })
         .eq("user_id", userId).gte("seen_at", since).not("seen_at", "is", null).limit(120) as any,
    admin.from("background_jobs").select("queued_at", { count: "exact", head: false })
         .eq("user_id", userId).eq("job_type", "resume_parse").gte("queued_at", since).limit(120) as any,
    admin.from("background_jobs").select("queued_at", { count: "exact", head: false })
         .eq("user_id", userId).eq("job_type", "match_compute").gte("queued_at", since).limit(120) as any,
    getCreditBalance(userId, "tailored_resume"),
    getCreditBalance(userId, "resume_reparse"),
    getCreditBalance(userId, "priority_recompute"),
  ]);

  const oldestOf = <T extends { created_at?: string; seen_at?: string; queued_at?: string }>(
    rows: T[] | null | undefined,
    field: "created_at" | "seen_at" | "queued_at",
  ): string | null => {
    const arr = rows ?? [];
    if (arr.length === 0) return null;
    const oldest = arr.reduce((acc, r) => {
      const v = r[field] as string | undefined;
      if (!v) return acc;
      return !acc || v < acc ? v : acc;
    }, null as string | null);
    return oldest ? new Date(new Date(oldest).getTime() + WINDOW_MS).toISOString() : null;
  };

  const build = (
    key:    UsageMetric["key"],
    label:  string,
    count:  number,
    limit:  number,
    resets: string | null,
  ): UsageMetric => {
    const unlimited = limit >= 9999;
    return {
      key,
      label,
      used:      count,
      limit:     unlimited ? Number.POSITIVE_INFINITY : limit,
      remaining: unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - count),
      unlimited,
      exhausted: !unlimited && count >= limit,
      resetsAt:  resets,
    };
  };

  return {
    plan:        entitle.plan,
    activeUntil: entitle.activeUntil,
    metrics: [
      build("tailored",    "Tailored resumes",  tailoredResp.count ?? 0, limits.tailoredResumeLimit, oldestOf(tailoredResp.data, "created_at")),
      build("matches",     "Matches viewed",    matchesResp.count  ?? 0, limits.matchesViewLimit,    oldestOf(matchesResp.data,  "seen_at")),
      build("reparses",    "Resume re-parses",  reparsesResp.count ?? 0, limits.resumeReparseLimit,  oldestOf(reparsesResp.data, "queued_at")),
      build("recomputes",  "Priority recomputes", recomputesResp.count ?? 0, limits.priorityRecomputes, oldestOf(recomputesResp.data, "queued_at")),
    ],
    credits: {
      tailored:  tailoredCredits,
      reparse:   reparseCredits,
      recompute: recomputeCredits,
    },
  };
}

/**
 * Human "in N days" helper that matches the existing resume-intel quota copy.
 */
export function resetsInWords(iso: string | null): string {
  if (!iso) return "next cycle";
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "soon";
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * Compact summary string for tight UI surfaces ("3/5 tailors").
 */
export function compactUsage(m: UsageMetric): string {
  if (m.unlimited) return "Unlimited";
  return `${m.used}/${m.limit}`;
}
