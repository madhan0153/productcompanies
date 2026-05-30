import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan } from "@/lib/billing/catalog";
import { dsaQuota } from "./quotas";
import { dsaTodayKey } from "./today";

// Server-only daily-state store for the DSA habit loop. All access is wrapped
// in try/catch and degrades to safe defaults, so the redesigned page renders
// even before the dsa_streak / dsa_daily_log migration is applied.

export type DailyStatus = "not_started" | "in_progress" | "solved";
export type DailyAction = "assigned" | "started" | "solved" | "skipped" | "frozen";

export interface DsaDailyState {
  streak: { current: number; longest: number; lastSolvedOn: string | null };
  freeze: { available: number; nextAccrualInDays: number };
  skips: { used: number; allowance: number; period: "week" | "day" };
  fullApproaches: { used: number; allowance: number | "unlimited"; remaining: number | "unlimited" };
  today: { status: DailyStatus; action: DailyAction };
}

interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_solved_on: string | null;
  freeze_tokens: number;
  freeze_accrued_on: string;
  skips_used: number;
  skips_period_start: string;
  full_approaches_used: number;
  full_approaches_month: string;
  bonus_used: number;
  bonus_on: string;
}

function monthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfWeekKey(date = new Date()): string {
  const d = new Date(date);
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function defaultRow(plan: BillingPlan): StreakRow {
  const today = dsaTodayKey();
  const q = dsaQuota(plan);
  return {
    current_streak: 0,
    longest_streak: 0,
    last_solved_on: null,
    freeze_tokens: 1,
    freeze_accrued_on: today,
    skips_used: 0,
    skips_period_start: q.skipsPeriod === "week" ? startOfWeekKey() : today,
    full_approaches_used: 0,
    full_approaches_month: monthKey(),
    bonus_used: 0,
    bonus_on: today,
  };
}

// Apply time-based resets (pure). Returns the normalized row; callers persist
// only when an action mutates state.
function applyResets(row: StreakRow, plan: BillingPlan): StreakRow {
  const q = dsaQuota(plan);
  const today = dsaTodayKey();
  const next = { ...row };

  // Skips reset on their window boundary.
  const periodKey = q.skipsPeriod === "week" ? startOfWeekKey() : today;
  if (next.skips_period_start !== periodKey) {
    next.skips_used = 0;
    next.skips_period_start = periodKey;
  }

  // Full-approach credits reset monthly.
  const mk = monthKey();
  if (next.full_approaches_month !== mk) {
    next.full_approaches_used = 0;
    next.full_approaches_month = mk;
  }

  // Bonus resets daily.
  if (next.bonus_on !== today) {
    next.bonus_used = 0;
    next.bonus_on = today;
  }

  // Freeze accrues one token every freezeEveryDays, capped at a small ceiling.
  const elapsed = daysBetween(next.freeze_accrued_on, today);
  if (elapsed >= q.freezeEveryDays) {
    const earned = Math.floor(elapsed / q.freezeEveryDays);
    next.freeze_tokens = Math.min(next.freeze_tokens + earned, 5);
    // advance the accrual marker by the consumed days
    const advanced = new Date(Date.parse(next.freeze_accrued_on) + earned * q.freezeEveryDays * 86_400_000);
    next.freeze_accrued_on = advanced.toISOString().slice(0, 10);
  }

  return next;
}

function toState(row: StreakRow, plan: BillingPlan, today: { status: DailyStatus; action: DailyAction }): DsaDailyState {
  const q = dsaQuota(plan);
  const allowance = q.fullApproachesPerMonth;
  const remaining =
    allowance === "unlimited" ? "unlimited" : Math.max(0, allowance - row.full_approaches_used);
  const nextAccrual = Math.max(
    0,
    q.freezeEveryDays - daysBetween(row.freeze_accrued_on, dsaTodayKey()),
  );
  return {
    streak: { current: row.current_streak, longest: row.longest_streak, lastSolvedOn: row.last_solved_on },
    freeze: { available: row.freeze_tokens, nextAccrualInDays: nextAccrual },
    skips: { used: row.skips_used, allowance: q.skipsAllowance, period: q.skipsPeriod },
    fullApproaches: { used: row.full_approaches_used, allowance, remaining },
    today,
  };
}

async function fetchStreakRow(userId: string, plan: BillingPlan): Promise<StreakRow> {
  try {
    const db = createSupabaseAdminClient() as unknown as {
      from: (t: string) => any;
    };
    const { data } = await db
      .from("dsa_streak")
      .select(
        "current_streak, longest_streak, last_solved_on, freeze_tokens, freeze_accrued_on, skips_used, skips_period_start, full_approaches_used, full_approaches_month, bonus_used, bonus_on",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return defaultRow(plan);
    return data as StreakRow;
  } catch {
    return defaultRow(plan);
  }
}

async function fetchTodayLog(userId: string): Promise<{ status: DailyStatus; action: DailyAction; slug: string | null }> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await db
      .from("dsa_daily_log")
      .select("status, action, slug")
      .eq("user_id", userId)
      .eq("day", dsaTodayKey())
      .maybeSingle();
    if (!data) return { status: "not_started", action: "assigned", slug: null };
    return data as { status: DailyStatus; action: DailyAction; slug: string | null };
  } catch {
    return { status: "not_started", action: "assigned", slug: null };
  }
}

async function persistRow(userId: string, row: StreakRow): Promise<void> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    await db
      .from("dsa_streak")
      .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() });
  } catch {
    /* table not present yet — no-op */
  }
}

async function upsertTodayLog(
  userId: string,
  slug: string,
  status: DailyStatus,
  action: DailyAction,
): Promise<void> {
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    await db.from("dsa_daily_log").upsert({
      user_id: userId,
      day: dsaTodayKey(),
      slug,
      status,
      action,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* no-op */
  }
}

// ── Public reads ─────────────────────────────────────────────────────────────

export async function getDsaDailyState(userId: string, plan: BillingPlan): Promise<DsaDailyState> {
  const row = applyResets(await fetchStreakRow(userId, plan), plan);
  const log = await fetchTodayLog(userId);
  return toState(row, plan, { status: log.status, action: log.action });
}

/** Ensure today's pick is logged (idempotent first-visit assignment). */
export async function ensureTodayAssigned(userId: string, slug: string): Promise<void> {
  const log = await fetchTodayLog(userId);
  if (!log.slug) await upsertTodayLog(userId, slug, "not_started", "assigned");
}

// ── Public mutations (called from server actions) ────────────────────────────

export interface SolveResult {
  current: number;
  longest: number;
  alreadySolved: boolean;
}

export async function markSolved(userId: string, plan: BillingPlan, slug: string): Promise<SolveResult> {
  const row = applyResets(await fetchStreakRow(userId, plan), plan);
  const log = await fetchTodayLog(userId);
  const today = dsaTodayKey();

  if (log.status === "solved" || row.last_solved_on === today) {
    return { current: row.current_streak, longest: row.longest_streak, alreadySolved: true };
  }

  const continues = row.last_solved_on
    ? daysBetween(row.last_solved_on, today) === 1
    : false;
  const current = continues ? row.current_streak + 1 : 1;
  const longest = Math.max(row.longest_streak, current);

  const updated: StreakRow = { ...row, current_streak: current, longest_streak: longest, last_solved_on: today };
  await persistRow(userId, updated);
  await upsertTodayLog(userId, slug, "solved", "solved");
  return { current, longest, alreadySolved: false };
}

export async function skipToday(
  userId: string,
  plan: BillingPlan,
  slug: string,
): Promise<{ ok: boolean; remaining: number }> {
  const q = dsaQuota(plan);
  const row = applyResets(await fetchStreakRow(userId, plan), plan);
  if (row.skips_used >= q.skipsAllowance) {
    return { ok: false, remaining: 0 };
  }
  const updated: StreakRow = { ...row, skips_used: row.skips_used + 1 };
  await persistRow(userId, updated);
  await upsertTodayLog(userId, slug, "not_started", "skipped");
  return { ok: true, remaining: Math.max(0, q.skipsAllowance - updated.skips_used) };
}

export async function freezeStreak(
  userId: string,
  plan: BillingPlan,
  slug: string,
): Promise<{ ok: boolean; remaining: number }> {
  const row = applyResets(await fetchStreakRow(userId, plan), plan);
  if (row.freeze_tokens <= 0) return { ok: false, remaining: 0 };
  // Freeze keeps the streak alive (marks the day continuous) without advancing it.
  const updated: StreakRow = { ...row, freeze_tokens: row.freeze_tokens - 1, last_solved_on: dsaTodayKey() };
  await persistRow(userId, updated);
  await upsertTodayLog(userId, slug, "not_started", "frozen");
  return { ok: true, remaining: updated.freeze_tokens };
}

/**
 * Spend one monthly full-approach credit (Free tier). Pro/Sprint are unlimited
 * and always succeed without consuming anything.
 */
export async function spendFullApproach(
  userId: string,
  plan: BillingPlan,
): Promise<{ ok: boolean; remaining: number | "unlimited" }> {
  const q = dsaQuota(plan);
  if (q.fullApproachesPerMonth === "unlimited") return { ok: true, remaining: "unlimited" };
  const row = applyResets(await fetchStreakRow(userId, plan), plan);
  if (row.full_approaches_used >= q.fullApproachesPerMonth) {
    return { ok: false, remaining: 0 };
  }
  const updated: StreakRow = { ...row, full_approaches_used: row.full_approaches_used + 1 };
  await persistRow(userId, updated);
  return { ok: true, remaining: Math.max(0, q.fullApproachesPerMonth - updated.full_approaches_used) };
}
