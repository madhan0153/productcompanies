import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "./notify";
import { isKindEnabled, type NotificationKind } from "./catalog";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

const DAY_MS = 24 * 60 * 60 * 1000;
// Don't nag about the same pipeline every single day.
const APPLICATION_REMINDER_COOLDOWN_MS = 2 * DAY_MS;
// On the first job alert (no prior watermark) only look back a day so we never
// open with "247 new roles" — keep it a genuine "what's new" nudge.
const JOB_ALERT_LOOKBACK_MS = DAY_MS;
// An application sitting in "applied" this long with no movement is a nudge.
const STUCK_APPLIED_MS = 7 * DAY_MS;
// Bound the IN() list when resolving interest companies from matches.
const MAX_INTEREST_JOB_IDS = 500;

type KindResult = { sent: number; delivered: number };
const EMPTY: KindResult = { sent: 0, delivered: 0 };

export type PeriodicResult = {
  eligible: number;
  byKind: Record<NotificationKind, number>;
  delivered: number;
};

// Runs every periodic push category for every eligible user in a single pass.
// "Eligible" = has an active push subscription AND the `notifications` consent.
// Per-category prefs (profiles.notification_prefs) gate each kind on top of that.
export async function runPeriodicPushNotifications(admin: Admin): Promise<PeriodicResult> {
  const result: PeriodicResult = {
    eligible: 0,
    byKind: { new_matches: 0, application_reminders: 0, job_alerts: 0 },
    delivered: 0,
  };

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .is("disabled_at", null);
  const candidateIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (!candidateIds.length) return result;

  const { data: consents } = await admin
    .from("consents")
    .select("user_id")
    .in("user_id", candidateIds)
    .eq("purpose", "notifications")
    .eq("granted", true);
  const consented = new Set((consents ?? []).map((c) => c.user_id));
  const eligible = candidateIds.filter((id) => consented.has(id));
  result.eligible = eligible.length;
  if (!eligible.length) return result;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, notification_prefs")
    .in("id", eligible);
  const prefsById = new Map<string, Record<string, unknown> | null>();
  for (const p of profiles ?? []) {
    prefsById.set(p.id, (p.notification_prefs as Record<string, unknown> | null) ?? null);
  }

  for (const uid of eligible) {
    const prefs = prefsById.get(uid) ?? null;

    if (isKindEnabled(prefs, "new_matches")) {
      const r = await safe(() => notifyNewMatches(admin, uid));
      result.byKind.new_matches += r.sent;
      result.delivered += r.delivered;
    }
    if (isKindEnabled(prefs, "application_reminders")) {
      const r = await safe(() => notifyApplicationReminders(admin, uid));
      result.byKind.application_reminders += r.sent;
      result.delivered += r.delivered;
    }
    if (isKindEnabled(prefs, "job_alerts")) {
      const r = await safe(() => notifyJobAlerts(admin, uid));
      result.byKind.job_alerts += r.sent;
      result.delivered += r.delivered;
    }
  }

  return result;
}

async function safe(fn: () => Promise<KindResult>): Promise<KindResult> {
  try {
    return await fn();
  } catch {
    // One user's failure must not abort the whole sweep.
    return EMPTY;
  }
}

// The most recent time we sent the user a given category — the per-type
// watermark that prevents re-notifying about the same thing.
async function lastNotifiedAt(admin: Admin, userId: string, kind: NotificationKind) {
  const { data } = await admin
    .from("notifications")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", kind)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.created_at ?? null;
}

// ── new_matches ────────────────────────────────────────────────────────────
async function notifyNewMatches(admin: Admin, uid: string): Promise<KindResult> {
  const since = await lastNotifiedAt(admin, uid, "new_matches");

  let query = admin
    .from("matches")
    .select("job_id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("verdict", "strong_fit");
  if (since) query = query.gte("computed_at", since);

  const { count } = await query;
  if (!count || count < 1) return EMPTY;

  const res = await notifyUser(uid, {
    type: "new_matches",
    title: count === 1 ? "1 new strong-fit role" : `${count} new strong-fit roles`,
    body: "Fresh matches at top product companies are ready for you.",
    url: "/matches",
    data: { count },
  });
  return { sent: res.logged ? 1 : 0, delivered: res.delivered };
}

// ── application_reminders ────────────────────────────────────────────────────
async function notifyApplicationReminders(admin: Admin, uid: string): Promise<KindResult> {
  const last = await lastNotifiedAt(admin, uid, "application_reminders");
  if (last && Date.now() - new Date(last).getTime() < APPLICATION_REMINDER_COOLDOWN_MS) {
    return EMPTY;
  }

  const { data: apps } = await admin
    .from("applications")
    .select("status, next_action_at, applied_at")
    .eq("user_id", uid)
    .in("status", ["saved", "applied", "interviewing"]);

  const now = Date.now();
  const stuckCutoff = now - STUCK_APPLIED_MS;
  let due = 0;
  for (const a of apps ?? []) {
    const isDue = a.next_action_at != null && new Date(a.next_action_at).getTime() <= now;
    const isStuck =
      a.status === "applied" &&
      a.applied_at != null &&
      new Date(a.applied_at).getTime() <= stuckCutoff;
    if (isDue || isStuck) due++;
  }
  if (!due) return EMPTY;

  const res = await notifyUser(uid, {
    type: "application_reminders",
    title: due === 1 ? "1 application needs attention" : `${due} applications need attention`,
    body: "You have follow-ups due in your pipeline.",
    url: "/applications",
    data: { count: due },
  });
  return { sent: res.logged ? 1 : 0, delivered: res.delivered };
}

// ── job_alerts ───────────────────────────────────────────────────────────────
async function notifyJobAlerts(admin: Admin, uid: string): Promise<KindResult> {
  // "Companies of interest" = anywhere the user has applied or strongly matches.
  const [appsRes, matchesRes] = await Promise.all([
    admin.from("applications").select("job_id").eq("user_id", uid),
    admin
      .from("matches")
      .select("job_id")
      .eq("user_id", uid)
      .in("verdict", ["strong_fit", "stretch"]),
  ]);

  const jobIds = [
    ...new Set([
      ...(appsRes.data ?? []).map((a) => a.job_id),
      ...(matchesRes.data ?? []).map((m) => m.job_id),
    ]),
  ].slice(0, MAX_INTEREST_JOB_IDS);
  if (!jobIds.length) return EMPTY;

  const { data: jobRows } = await admin.from("jobs").select("company_id").in("id", jobIds);
  const interestCompanies = [...new Set((jobRows ?? []).map((j) => j.company_id))];
  if (!interestCompanies.length) return EMPTY;

  const last = await lastNotifiedAt(admin, uid, "job_alerts");
  const since = last ?? new Date(Date.now() - JOB_ALERT_LOOKBACK_MS).toISOString();

  const { count } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("company_id", interestCompanies)
    .eq("is_active", true)
    .gte("created_at", since);
  if (!count || count < 1) return EMPTY;

  const res = await notifyUser(uid, {
    type: "job_alerts",
    title:
      count === 1
        ? "1 new role at a company you're tracking"
        : `${count} new roles at companies you're tracking`,
    body: "Newly posted where you've applied or strongly match.",
    url: "/matches",
    data: { count },
  });
  return { sent: res.logged ? 1 : 0, delivered: res.delivered };
}
