import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/log";
import type { Json } from "@/lib/supabase/types";
import { getWebPush } from "./web-push";
import { PushPayloadSchema, safeNotificationPath, type PushPayload } from "./payload";
import { getKindFrequency, NOTIFICATION_KINDS, type NotificationKind } from "./catalog";

const FAILURE_RETIRE_THRESHOLD = 5;
const RETRY_BASE_MS = 5 * 60 * 1000;

export type NotifyResult = {
  notificationId: string | null;
  delivered: number;
  failed: number;
  pruned: number;
  logged: boolean;
  duplicate: boolean;
};

function classifyFailure(statusCode: number | undefined) {
  if (statusCode === 404 || statusCode === 410) return "expired_subscription";
  if (statusCode === 401 || statusCode === 403) return "provider_auth";
  if (statusCode === 413) return "payload_too_large";
  if (statusCode === 429) return "rate_limited";
  if (statusCode && statusCode >= 500) return "provider_unavailable";
  return "network_or_unknown";
}

function isSchemaDriftError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204" || error?.code === "PGRST205";
}

export async function notifyUser(userId: string, input: PushPayload): Promise<NotifyResult> {
  const payload = PushPayloadSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const empty = {
    notificationId: null,
    delivered: 0,
    failed: 0,
    pruned: 0,
    logged: false,
    duplicate: false,
  };

  const [{ data: consent }, { data: preferences }] = await Promise.all([
    admin
      .from("consents")
      .select("granted")
      .eq("user_id", userId)
      .eq("purpose", "notifications")
      .eq("granted", true)
      .limit(1),
    admin
      .from("notification_preferences")
      .select("push_enabled, category_frequencies")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!consent?.length) return empty;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + payload.ttlSeconds * 1000).toISOString();
  let { data: notification, error: notificationError } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      url: safeNotificationPath(payload.url),
      data: (payload.data ?? {}) as Json,
      priority: payload.priority,
      idempotency_key: payload.idempotencyKey ?? null,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, status")
    .maybeSingle();

  if (isSchemaDriftError(notificationError)) {
    const fallback = await admin
      .from("notifications")
      .insert({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        url: safeNotificationPath(payload.url),
        data: (payload.data ?? {}) as Json,
      })
      .select("id")
      .maybeSingle();
    notification = fallback.data ? { id: fallback.data.id, status: "pending" } : null;
    notificationError = fallback.error;
  }

  if (notificationError?.code === "23505" && payload.idempotencyKey) {
    return { ...empty, logged: true, duplicate: true };
  }
  if (notificationError) throw notificationError;
  if (!notification) {
    return { ...empty, logged: true, duplicate: true };
  }

  const category = NOTIFICATION_KINDS.includes(payload.type as NotificationKind)
    ? (payload.type as NotificationKind)
    : null;
  const frequency = category
    ? getKindFrequency(
        (preferences?.category_frequencies as Record<string, unknown> | null) ?? null,
        category,
      )
    : "immediate";
  if (
    preferences?.push_enabled === false ||
    (frequency !== "immediate" && payload.deliveryWindow !== "due")
  ) {
    await admin.from("notifications").update({ status: "in_app_only" }).eq("id", notification.id);
    return { ...empty, notificationId: notification.id, logged: true };
  }

  let { data: subs, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("user_id", userId)
    .is("disabled_at", null);
  if (isSchemaDriftError(subscriptionsError)) {
    const fallback = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)
      .is("disabled_at", null);
    subs = (fallback.data ?? []).map((sub) => ({ ...sub, failure_count: 0 }));
    subscriptionsError = fallback.error;
  }
  if (subscriptionsError) throw subscriptionsError;
  if (!subs?.length) {
    await admin.from("notifications").update({ status: "in_app_only" }).eq("id", notification.id);
    return { ...empty, notificationId: notification.id, logged: true };
  }

  const wp = getWebPush();
  if (!wp) {
    await admin.from("notifications").update({ status: "transport_unconfigured" }).eq("id", notification.id);
    return { ...empty, notificationId: notification.id, logged: true };
  }

  const body = JSON.stringify({
    notificationId: notification.id,
    title: payload.title,
    body: payload.body ?? "",
    url: safeNotificationPath(payload.url),
    type: payload.type,
    priority: payload.priority,
    timestamp: now.getTime(),
    data: payload.data ?? {},
  });

  let delivered = 0;
  let failed = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          {
            TTL: payload.ttlSeconds,
            urgency: payload.priority === "critical" ? "high" : payload.priority === "engagement" ? "low" : "normal",
          },
        );
        delivered++;
        const sentAt = new Date().toISOString();
        const { error: updateError } = await admin.from("push_subscriptions").update({
            updated_at: sentAt,
            last_used_at: sentAt,
            last_success_at: sentAt,
            failure_count: 0,
          }).eq("id", sub.id);
        if (isSchemaDriftError(updateError)) {
          await admin.from("push_subscriptions").update({ disabled_at: null }).eq("id", sub.id);
        }
        await admin.from("notification_delivery_attempts").insert({
            notification_id: notification.id,
            subscription_id: sub.id,
            status: "sent",
          }).then(() => undefined);
      } catch (error) {
        failed++;
        const statusCode = (error as { statusCode?: number }).statusCode;
        const permanent = statusCode === 404 || statusCode === 410;
        const nextCount = (sub.failure_count ?? 0) + 1;
        const retired = permanent || nextCount >= FAILURE_RETIRE_THRESHOLD;
        const attemptedAt = new Date();
        const nextRetryAt = permanent || retired
          ? null
          : new Date(attemptedAt.getTime() + RETRY_BASE_MS * 2 ** Math.min(nextCount - 1, 5)).toISOString();

        const { error: updateError } = await admin.from("push_subscriptions").update({
            updated_at: attemptedAt.toISOString(),
            last_failure_at: attemptedAt.toISOString(),
            failure_count: nextCount,
            disabled_at: retired ? attemptedAt.toISOString() : null,
          }).eq("id", sub.id);
        if (isSchemaDriftError(updateError) && retired) {
          await admin.from("push_subscriptions")
            .update({ disabled_at: attemptedAt.toISOString() })
            .eq("id", sub.id);
        }
        await admin.from("notification_delivery_attempts").insert({
            notification_id: notification.id,
            subscription_id: sub.id,
            attempt_no: nextCount,
            status: permanent || retired ? "permanent_failure" : "retryable_failure",
            provider_status: statusCode ?? null,
            failure_class: classifyFailure(statusCode),
            next_retry_at: nextRetryAt,
          }).then(() => undefined);
        if (retired) pruned++;
        logEvent("warn", "push_send_failed", {
          user_id: userId.slice(0, 8),
          status: statusCode ?? "unknown",
          failure_class: classifyFailure(statusCode),
          failure_count: nextCount,
        });
      }
    }),
  );

  await admin
    .from("notifications")
    .update({
      status: delivered > 0 ? (failed > 0 ? "partially_sent" : "sent") : "failed",
      sent_at: delivered > 0 ? new Date().toISOString() : null,
    })
    .eq("id", notification.id)
    .then(() => undefined);

  return {
    notificationId: notification.id,
    delivered,
    failed,
    pruned,
    logged: true,
    duplicate: false,
  };
}
