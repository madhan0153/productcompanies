import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "./notify";
import { getKindFrequency, type NotificationKind } from "./catalog";

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
    byKind: {
      job_matches: 0,
      saved_searches: 0,
      application_reminders: 0,
      interview_reminders: 0,
      resume_updates: 0,
      preparation_reminders: 0,
      career_sprint: 0,
      product_announcements: 0,
      billing: 0,
      security: 0,
    },
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

  const { data: preferences } = await admin
    .from("notification_preferences")
    .select("user_id, push_enabled, timezone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, category_frequencies")
    .in("user_id", eligible);
  const prefsById = new Map<string, (typeof preferences extends (infer T)[] | null ? T : never)>();
  for (const p of preferences ?? []) {
    prefsById.set(p.user_id, p);
  }

  for (const uid of eligible) {
    const prefs = prefsById.get(uid) ?? null;
    if (prefs?.push_enabled === false || (prefs && isQuietHours(prefs))) continue;
    const frequencies = (prefs?.category_frequencies as Record<string, unknown> | null) ?? null;

    if (isDueFrequency(getKindFrequency(frequencies, "job_matches"), prefs?.timezone)) {
      const r = await safe(() => notifyNewMatches(admin, uid));
      result.byKind.job_matches += r.sent;
      result.delivered += r.delivered;
    }
    if (isDueFrequency(getKindFrequency(frequencies, "application_reminders"), prefs?.timezone)) {
      const r = await safe(() => notifyApplicationReminders(admin, uid));
      result.byKind.application_reminders += r.sent;
      result.delivered += r.delivered;
    }
    if (isDueFrequency(getKindFrequency(frequencies, "saved_searches"), prefs?.timezone)) {
      const r = await safe(() => notifyJobAlerts(admin, uid));
      result.byKind.saved_searches += r.sent;
      result.delivered += r.delivered;
    }
  }

  return result;
}

function localParts(timezone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function isDueFrequency(frequency: string, timezone = "Asia/Kolkata") {
  if (frequency === "disabled") return false;
  if (frequency !== "weekly") return true;
  return localParts(timezone).weekday === "Mon";
}

function isQuietHours(prefs: {
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}) {
  if (!prefs.quiet_hours_enabled) return false;
  const parts = localParts(prefs.timezone);
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  const [startHour, startMinute] = prefs.quiet_hours_start.split(":").map(Number);
  const [endHour, endMinute] = prefs.quiet_hours_end.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start < end ? current >= start && current < end : current >= start || current < end;
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
  const since = await lastNotifiedAt(admin, uid, "job_matches");

  let query = admin
    .from("matches")
    .select("job_id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("verdict", "strong_fit");
  if (since) query = query.gte("computed_at", since);

  const { count } = await query;
  if (!count || count < 1) return EMPTY;

  const res = await notifyUser(uid, {
    type: "job_matches",
    title: count === 1 ? "1 new strong-fit role" : `${count} new strong-fit roles`,
    body: "Fresh matches at top product companies are ready for you.",
    url: "/matches",
    data: { count },
    deliveryWindow: "due",
    idempotencyKey: `job_matches:${new Date().toISOString().slice(0, 10)}`,
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
    deliveryWindow: "due",
    idempotencyKey: `application_reminders:${new Date().toISOString().slice(0, 10)}`,
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

  const last = await lastNotifiedAt(admin, uid, "saved_searches");
  const since = last ?? new Date(Date.now() - JOB_ALERT_LOOKBACK_MS).toISOString();

  const { count } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .in("company_id", interestCompanies)
    .eq("is_active", true)
    .gte("created_at", since);
  if (!count || count < 1) return EMPTY;

  const res = await notifyUser(uid, {
    type: "saved_searches",
    title:
      count === 1
        ? "1 new role at a company you're tracking"
        : `${count} new roles at companies you're tracking`,
    body: "Newly posted where you've applied or strongly match.",
    url: "/matches",
    data: { count },
    deliveryWindow: "due",
    idempotencyKey: `saved_searches:${new Date().toISOString().slice(0, 10)}`,
  });
  return { sent: res.logged ? 1 : 0, delivered: res.delivered };
}
