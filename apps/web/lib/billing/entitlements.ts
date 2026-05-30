import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan, Json } from "@/lib/supabase/types";
import { betterPlan, getPlanLimits } from "./catalog";
import { serverEnv } from "@/lib/env";
import { isAdminEmail } from "@/lib/admin/auth";

export interface EntitlementState {
  plan: BillingPlan;
  source: string;
  activeUntil: string | null;
  tailoredResumeLimit: number;
  priorityLevel: number;
  featureFlags: Json;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function isFutureOrNull(value: string | null): boolean {
  return !value || new Date(value).getTime() > Date.now();
}

function applyPlan(current: BillingPlan, next: BillingPlan): BillingPlan {
  return betterPlan(current, next);
}

export async function resolveEntitlements(userId: string): Promise<EntitlementState> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const [{ data: subscriptions }, { data: grants }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId),
    admin
      .from("entitlement_grants")
      .select("grant_type, plan, expires_at, source, revoked_at")
      .eq("user_id", userId)
      .lte("starts_at", now),
  ]);

  let plan: BillingPlan = "free";
  let source = "free";
  let activeUntil: string | null = null;

  for (const sub of subscriptions ?? []) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) continue;
    if (!isFutureOrNull(sub.current_period_end)) continue;
    const next = applyPlan(plan, sub.plan);
    if (next !== plan) {
      plan = next;
      source = "subscription";
      activeUntil = sub.current_period_end;
    }
  }

  for (const grant of grants ?? []) {
    if (grant.revoked_at || !isFutureOrNull(grant.expires_at)) continue;
    const grantPlan =
      grant.plan ??
      (grant.grant_type === "career_sprint_3_months" ? "career_sprint" :
       grant.grant_type === "pro_12_months" || grant.grant_type === "pro_lifetime" ? "pro" :
       null);
    if (!grantPlan) continue;
    const next = applyPlan(plan, grantPlan);
    if (next !== plan || source === "free") {
      plan = next;
      source = grant.source;
      activeUntil = grant.expires_at;
    }
  }

  const limits = getPlanLimits(plan);
  return {
    plan,
    source,
    activeUntil,
    tailoredResumeLimit: limits.tailoredResumeLimit,
    priorityLevel: limits.priorityLevel,
    featureFlags: limits.featureFlags as unknown as Json,
  };
}

export async function refreshEntitlements(userId: string): Promise<EntitlementState> {
  const admin = createSupabaseAdminClient();
  const entitlements = await resolveEntitlements(userId);
  const now = new Date().toISOString();

  await admin.from("user_entitlements").upsert({
    user_id: userId,
    plan: entitlements.plan,
    source: entitlements.source,
    active_until: entitlements.activeUntil,
    tailored_resume_limit: entitlements.tailoredResumeLimit,
    priority_level: entitlements.priorityLevel,
    feature_flags: entitlements.featureFlags,
    refreshed_at: now,
    updated_at: now,
  });

  return entitlements;
}

export async function getEntitlements(userId: string): Promise<EntitlementState> {
  const base = await readEntitlements(userId);
  return applyAdminOverride(userId, base);
}

async function readEntitlements(userId: string): Promise<EntitlementState> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_entitlements")
    .select("plan, source, active_until, tailored_resume_limit, priority_level, feature_flags, refreshed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return refreshEntitlements(userId);

  const stale = new Date(data.refreshed_at).getTime() < Date.now() - 5 * 60_000;
  if (stale) return refreshEntitlements(userId);

  return {
    plan: data.plan,
    source: data.source,
    activeUntil: data.active_until,
    tailoredResumeLimit: data.tailored_resume_limit,
    priorityLevel: data.priority_level,
    featureFlags: data.feature_flags,
  };
}

// Per-instance memo of admin status, so the override does not pay an auth
// lookup on every entitlement read. Immediate on the first call (and after a
// cold start); near-zero cost thereafter.
const adminStatusCache = new Map<string, { isAdmin: boolean; at: number }>();
const ADMIN_STATUS_TTL_MS = 10 * 60_000;

async function isUserAdmin(userId: string): Promise<boolean> {
  if (!serverEnv.ADMIN_EMAILS) return false;
  const cached = adminStatusCache.get(userId);
  if (cached && Date.now() - cached.at < ADMIN_STATUS_TTL_MS) return cached.isAdmin;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const result = isAdminEmail(data?.user?.email ?? null);
    adminStatusCache.set(userId, { isAdmin: result, at: Date.now() });
    return result;
  } catch {
    return cached?.isAdmin ?? false;
  }
}

/**
 * Staff superuser override. Allow-listed admin emails (ADMIN_EMAILS) get full
 * Career Sprint entitlements across the entire app — no paywalls anywhere — in
 * addition to the /admin route gate. Applied at read time so it takes effect
 * immediately regardless of any cached free-tier row. Skipped entirely when no
 * admin allowlist is configured (zero overhead for that case).
 */
async function applyAdminOverride(userId: string, base: EntitlementState): Promise<EntitlementState> {
  if (!serverEnv.ADMIN_EMAILS) return base;
  if (!(await isUserAdmin(userId))) return base;

  const limits = getPlanLimits("career_sprint");
  return {
    plan: "career_sprint",
    source: "admin",
    activeUntil: null,
    tailoredResumeLimit: limits.tailoredResumeLimit,
    priorityLevel: limits.priorityLevel,
    featureFlags: limits.featureFlags as unknown as Json,
  };
}
