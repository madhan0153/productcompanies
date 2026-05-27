// /api/billing/sync — robustness fallback.
//
// Webhooks can be delayed, mis-configured, or blocked by middleware. After
// successful checkout the user lands on /billing/success with the
// subscription_id (and sometimes status) in the URL. This endpoint:
//   1. Validates the user is authenticated
//   2. Pulls the subscription from Dodo's API by id
//   3. Verifies it belongs to this user (via metadata.user_id or email match)
//   4. Upserts the local subscriptions + billing_customers rows
//   5. Refreshes user_entitlements
//
// Idempotent: calling it twice is safe. Designed to converge state without
// waiting for the webhook — the webhook becomes a redundancy, not a SPOF.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { recordAdminAction } from "@/lib/admin/audit";
import { CHECKOUT_PRODUCTS, type BillingPlan, type CheckoutProductId } from "@/lib/billing/catalog";
import type { Json, SubscriptionStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://api.dodopayments.com";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? v as Record<string, unknown> : {};
}
function strVal(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}
function isoVal(o: Record<string, unknown>, keys: string[]): string | null {
  const raw = strVal(o, keys);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function statusMap(dodoStatus: string | null): SubscriptionStatus {
  switch ((dodoStatus ?? "").toLowerCase()) {
    case "active":    return "active";
    case "trialing":  return "trialing";
    case "on_hold":   return "on_hold";
    case "past_due":  return "past_due";
    case "cancelled":
    case "canceled":  return "cancelled";
    case "expired":   return "expired";
    case "failed":    return "failed";
    default:          return "active";
  }
}

function planFromProductId(productId: string | null): BillingPlan | null {
  if (!productId) return null;
  for (const [key, p] of Object.entries(CHECKOUT_PRODUCTS) as Array<[CheckoutProductId, typeof CHECKOUT_PRODUCTS[CheckoutProductId]]>) {
    const envValue =
      key === "pro_monthly"            ? serverEnv.DODO_PRODUCT_PRO_MONTHLY_ID :
      key === "pro_yearly"             ? serverEnv.DODO_PRODUCT_PRO_YEARLY_ID :
      key === "career_sprint_monthly"  ? serverEnv.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID :
      key === "career_sprint_yearly"   ? serverEnv.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID :
      key === "tailor_credits_50"      ? serverEnv.DODO_PRODUCT_TAILOR_CREDITS_50_ID :
      "";
    if (envValue && envValue === productId) return p.plan;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: { subscription_id?: string; product?: string };
  try { body = await req.json(); } catch { body = {}; }

  const subscriptionId = body.subscription_id?.trim();
  const fallbackProduct = (body.product ?? "") as CheckoutProductId;
  if (!subscriptionId) {
    return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  }

  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Billing not configured" }, { status: 500 });

  const admin = createSupabaseAdminClient();

  // Short-circuit: if we already have this subscription tied to this user, refresh + return
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, status, current_period_end")
    .eq("provider", "dodo")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existing && existing.user_id === user.id && existing.status === "active") {
    await refreshEntitlements(user.id);
    return NextResponse.json({ ok: true, plan: existing.plan, source: "cache" });
  }

  // Fetch from Dodo to confirm the subscription is real and tied to this user
  let dodoData: Record<string, unknown>;
  try {
    const res = await fetch(`${dodoBaseUrl()}/subscriptions/${subscriptionId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Dodo lookup failed: ${res.status} ${txt.slice(0, 140)}` }, { status: 502 });
    }
    dodoData = asRecord(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Network error contacting Dodo" },
      { status: 502 },
    );
  }

  // Defensive metadata extraction (Dodo wraps differently per API version)
  const meta = asRecord(dodoData.metadata ?? dodoData.custom_data ?? {});
  const metaUserId = strVal(meta, ["user_id", "userId"]);
  const customerObj = asRecord(dodoData.customer);
  const customerEmail = strVal(customerObj, ["email"]) ?? strVal(dodoData, ["customer_email", "email"]);
  const productId = strVal(dodoData, ["product_id", "productId"]);
  const customerId = strVal(dodoData, ["customer_id", "customerId"]) ?? strVal(customerObj, ["id"]);
  const statusRaw = strVal(dodoData, ["status"]);

  // Ownership check: at least ONE of these must tie back to our user
  const ownsByMeta  = metaUserId === user.id;
  const ownsByEmail = customerEmail && customerEmail.toLowerCase() === (user.email ?? "").toLowerCase();
  if (!ownsByMeta && !ownsByEmail) {
    await recordAdminAction({
      actionType: "trigger_cron", targetRef: `sync-rejected:${subscriptionId}`,
      status: "failed", metadata: { reason: "ownership_mismatch", user_id: user.id },
    });
    return NextResponse.json({ error: "This subscription is not linked to your account." }, { status: 403 });
  }

  const plan = planFromProductId(productId)
    ?? (fallbackProduct && fallbackProduct in CHECKOUT_PRODUCTS ? CHECKOUT_PRODUCTS[fallbackProduct].plan : null)
    ?? "pro";
  if (plan === "free" || plan === null) {
    return NextResponse.json({ error: "Could not determine plan from Dodo product." }, { status: 422 });
  }
  const mappedStatus = statusMap(statusRaw);

  // Upsert customer
  if (customerId) {
    await admin.from("billing_customers").upsert({
      user_id:           user.id,
      dodo_customer_id:  customerId,
      billing_email:     customerEmail ?? user.email ?? null,
      currency:          strVal(dodoData, ["currency"]) ?? "INR",
      updated_at:        new Date().toISOString(),
    });
  }

  // Upsert subscription row
  await admin.from("subscriptions").upsert({
    user_id:                 user.id,
    provider:                "dodo",
    provider_customer_id:    customerId,
    provider_subscription_id: subscriptionId,
    provider_product_id:     productId,
    plan,
    status:                  mappedStatus,
    current_period_start:    isoVal(dodoData, ["current_period_start", "period_start", "created_at"]),
    current_period_end:      isoVal(dodoData, ["current_period_end", "period_end", "next_billing_date", "expires_at"]),
    cancel_at_period_end:    Boolean(dodoData.cancel_at_period_end ?? dodoData.cancel_at_next_billing_date),
    cancelled_at:            isoVal(dodoData, ["cancelled_at", "canceled_at"]),
    metadata:                dodoData as unknown as Json,
    updated_at:              new Date().toISOString(),
  }, { onConflict: "provider,provider_subscription_id" });

  const entitlement = await refreshEntitlements(user.id);
  return NextResponse.json({ ok: true, plan: entitlement.plan, source: "synced" });
}
