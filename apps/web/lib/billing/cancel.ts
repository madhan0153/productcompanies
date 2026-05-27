import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://api.dodopayments.com";
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
        status: "cancelled",
        cancel_at_next_billing_date: !opts.immediate,
        cancellation_reason: opts.reason ?? "user_self_service",
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, message: `Cancellation failed (${res.status}): ${txt.slice(0, 160)}` };
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
    return { ok: false, message: err instanceof Error ? err.message : "Cancel request failed" };
  }
}
