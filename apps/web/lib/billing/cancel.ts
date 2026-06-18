import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { logEvent } from "@/lib/observability/log";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export interface CancelOptions {
  userId:    string;
  reason?:   string;
  /** When true, cancel immediately. When false, cancel at end of billing period (recommended). */
  immediate?: boolean;
}

export async function cancelActiveSubscription(opts: CancelOptions): Promise<{ ok: boolean; message: string }> {
  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return { ok: false, message: "Billing is not configured." };

  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, provider, provider_subscription_id, status")
    .eq("user_id", opts.userId)
    .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
    .in("status", ["active", "trialing", "on_hold"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!sub || !sub.provider_subscription_id) {
    return { ok: false, message: "No active subscription found on your account." };
  }

  if (sub.provider !== "dodo") {
    return { ok: false, message: `Cancellation for ${sub.provider} not yet supported here.` };
  }

  try {
    const res = await fetch(`${dodoBaseUrl()}/subscriptions/${sub.provider_subscription_id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        cancel_at_next_billing_date: !opts.immediate,
      }),
    });

    if (!res.ok) {
      logEvent("warn", "billing_cancel_provider_failed", {
        user_id_prefix: opts.userId.slice(0, 8),
        subscription_id_prefix: sub.provider_subscription_id.slice(0, 12),
        status: res.status,
      });
      return { ok: false, message: "Dodo could not schedule the cancellation. Please try again." };
    }

    // Mirror state immediately so the UI reflects it without waiting for the webhook
    await admin
      .from("subscriptions")
      .update({
        cancel_at_period_end: !opts.immediate,
        cancelled_at: opts.immediate ? new Date().toISOString() : null,
        status: opts.immediate ? "cancelled" : sub.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    return {
      ok: true,
      message: opts.immediate
        ? "Subscription cancelled. Access ends now."
        : "Subscription cancelled. You keep access until the end of the billing period.",
    };
  } catch (err) {
    logEvent("error", "billing_cancel_failed", {
      user_id_prefix: opts.userId.slice(0, 8),
      error_kind: err instanceof Error ? err.name : "unknown",
    });
    return { ok: false, message: "Cancel request failed. Please try again." };
  }
}
