import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/log";
import type { Json } from "@/lib/supabase/types";
import { getWebPush } from "./web-push";

// How many consecutive transient failures before we soft-retire an endpoint.
const FAILURE_RETIRE_THRESHOLD = 5;
// Push payload TTL — a "new matches" nudge is stale after a day.
const PUSH_TTL_SECONDS = 60 * 60 * 24;

export type PushPayload = {
  type: string;
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
};

export type NotifyResult = { delivered: number; pruned: number; logged: boolean };

/**
 * Deliver a notification to a single user across all of their active push
 * subscriptions. The flow is, in order:
 *   1. DPDP gate — bail unless the user consents to the `notifications` purpose.
 *   2. Append to `notifications` (the in-app feed / audit) regardless of whether
 *      a live push endpoint exists.
 *   3. Fan out to each endpoint; prune dead ones (404/410), retire flapping ones.
 *
 * Runs as service role (admin client) — intended for cron/server contexts only.
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<NotifyResult> {
  const admin = createSupabaseAdminClient();

  // 1. Consent is the legal basis. No consent → no notification, full stop.
  const { data: consent } = await admin
    .from("consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", "notifications")
    .eq("granted", true)
    .limit(1);
  if (!consent?.length) return { delivered: 0, pruned: 0, logged: false };

  // 2. Always record the notification (in-app feed survives even if the user
  //    has no live device, e.g. revoked browser permission but kept consent).
  await admin.from("notifications").insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? null,
    url: payload.url ?? null,
    data: (payload.data ?? {}) as Json,
  });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("user_id", userId)
    .is("disabled_at", null);
  if (!subs?.length) return { delivered: 0, pruned: 0, logged: true };

  const wp = getWebPush();
  if (!wp) return { delivered: 0, pruned: 0, logged: true };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/dashboard",
    type: payload.type,
    data: payload.data ?? {},
  });

  let delivered = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: PUSH_TTL_SECONDS, urgency: "normal" },
        );
        delivered++;
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", sub.id);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 = the subscription is gone for good. Retire immediately.
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .update({ disabled_at: new Date().toISOString() })
            .eq("id", sub.id);
          pruned++;
          return;
        }
        // Transient (429/5xx/network) — count it; retire after repeated misses.
        const nextCount = (sub.failure_count ?? 0) + 1;
        await admin
          .from("push_subscriptions")
          .update(
            nextCount >= FAILURE_RETIRE_THRESHOLD
              ? { failure_count: nextCount, disabled_at: new Date().toISOString() }
              : { failure_count: nextCount },
          )
          .eq("id", sub.id);
        if (nextCount >= FAILURE_RETIRE_THRESHOLD) pruned++;
        logEvent("warn", "push_send_failed", {
          user_id: userId.slice(0, 8),
          status: statusCode ?? "unknown",
          failure_count: nextCount,
        });
      }
    }),
  );

  return { delivered, pruned, logged: true };
}
