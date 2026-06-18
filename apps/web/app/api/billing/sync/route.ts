// /api/billing/sync — robust direct-sync that doesn't depend on the webhook.
//
// After successful checkout the user lands on /billing/success?subscription_id=...
// This endpoint:
//   1. Validates the user is authenticated
//   2. GETs the subscription from Dodo's API by id
//   3. Defensively parses Dodo's response (handles wrappers, nested customer,
//      different metadata key names) — Dodo's shapes differ between modes
//   4. Verifies ownership via ANY of:
//      - metadata.user_id === auth.user.id
//      - customer.email === auth.user.email
//      - return_url email param === auth.user.email
//      - customer_id matches an existing billing_customers row for this user
//   5. Upserts the local subscriptions + billing_customers rows
//   6. Refreshes user_entitlements
//
// Idempotent. Logs sanitized step metadata only; never log emails, full user
// ids, payment/customer ids, or upstream response bodies.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { CHECKOUT_PRODUCTS, type BillingPlan, type CheckoutProductId } from "@/lib/billing/catalog";
import { logEvent } from "@/lib/observability/log";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import type { Json, SubscriptionStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? v as Record<string, unknown> : {};
}

/** Look for a string value across many candidate keys + nested wrappers. */
function deepStr(root: Record<string, unknown>, keys: string[]): string | null {
  const candidates: Record<string, unknown>[] = [
    root,
    asRecord(root.data),
    asRecord(root.subscription),
    asRecord(root.object),
    asRecord(root.payload),
  ];
  for (const obj of candidates) {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return null;
}

function deepObj(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const candidates: unknown[] = [
    root[key],
    asRecord(root.data)[key],
    asRecord(root.subscription)[key],
    asRecord(root.object)[key],
  ];
  for (const c of candidates) {
    const r = asRecord(c);
    if (Object.keys(r).length > 0) return r;
  }
  return {};
}

function isoVal(root: Record<string, unknown>, keys: string[]): string | null {
  const raw = deepStr(root, keys);
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
  const entries: Array<[CheckoutProductId, string | undefined]> = [
    ["pro_monthly",            serverEnv.DODO_PRODUCT_PRO_MONTHLY_ID],
    ["pro_yearly",             serverEnv.DODO_PRODUCT_PRO_YEARLY_ID],
    ["career_sprint_monthly",  serverEnv.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID],
    ["career_sprint_yearly",   serverEnv.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID],
    ["tailor_credits_50",      serverEnv.DODO_PRODUCT_TAILOR_CREDITS_50_ID],
    ["payment_test_10_inr",    serverEnv.DODO_PRODUCT_PAYMENT_TEST_10_INR_ID],
  ];
  for (const [key, envValue] of entries) {
    if (envValue && envValue === productId) return CHECKOUT_PRODUCTS[key].plan;
  }
  return null;
}

function shortId(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length <= 10 ? `${value.slice(0, 4)}...` : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function errorKind(err: unknown): string {
  return err instanceof Error ? err.name : "unknown";
}

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_sync_ip", { limit: 30, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logEvent("info", "billing_sync_unauthenticated");
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const userLimit = await rateLimitRoute(req, "billing_sync", {
    limit: 10,
    windowMs: 10 * 60_000,
    userId: user.id,
  });
  if (userLimit) return userLimit;

  let body: { subscription_id?: string; product?: string; emailHint?: string };
  try { body = await req.json(); } catch { body = {}; }

  const subscriptionId   = body.subscription_id?.trim();
  const fallbackProduct  = (body.product ?? "") as CheckoutProductId;
  const emailHint        = body.emailHint?.trim().toLowerCase() ?? null;
  if (!subscriptionId) {
    logEvent("info", "billing_sync_missing_subscription_id", {
      user_id_prefix: user.id.slice(0, 8),
    });
    return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  }

  logEvent("info", "billing_sync_start", {
    user_id_prefix:         user.id.slice(0, 8),
    subscription_id_prefix: shortId(subscriptionId),
    fallback_product:       fallbackProduct || null,
    has_email_hint:         Boolean(emailHint),
  });

  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    logEvent("error", "billing_sync_api_key_missing");
    return NextResponse.json({ error: "Billing not configured (DODO_PAYMENTS_API_KEY missing)" }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();

  // Short-circuit: if we already have an active sub on this user, just refresh
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, status")
    .eq("provider", "dodo")
    .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existing && existing.user_id === user.id && existing.status === "active") {
    await refreshEntitlements(user.id);
    logEvent("info", "billing_sync_cache_hit", {
      user_id_prefix:         user.id.slice(0, 8),
      subscription_id_prefix: shortId(subscriptionId),
      plan:                   existing.plan,
    });
    return NextResponse.json({ ok: true, plan: existing.plan, source: "cache" });
  }

  // Fetch from Dodo
  let dodoData: Record<string, unknown>;
  try {
    const url = `${dodoBaseUrl()}/subscriptions/${subscriptionId}`;
    logEvent("info", "billing_sync_fetching_subscription", {
      subscription_id_prefix: shortId(subscriptionId),
    });
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) {
      logEvent("warn", "billing_sync_dodo_lookup_failed", {
        subscription_id_prefix: shortId(subscriptionId),
        status: res.status,
      });
      return NextResponse.json(
        { error: `Dodo lookup failed with HTTP ${res.status}` },
        { status: 502 },
      );
    }
    try {
      dodoData = asRecord(JSON.parse(txt));
    } catch {
      logEvent("warn", "billing_sync_dodo_non_json", {
        subscription_id_prefix: shortId(subscriptionId),
      });
      return NextResponse.json({ error: "Dodo returned non-JSON response" }, { status: 502 });
    }
    logEvent("info", "billing_sync_dodo_response_shape", {
      subscription_id_prefix: shortId(subscriptionId),
      key_count:              Object.keys(dodoData).length,
      has_data:               Object.hasOwn(dodoData, "data"),
      has_subscription:       Object.hasOwn(dodoData, "subscription"),
      has_customer:           Object.hasOwn(dodoData, "customer"),
      has_metadata:           Object.hasOwn(dodoData, "metadata"),
    });
  } catch (err) {
    logEvent("warn", "billing_sync_dodo_network_error", {
      subscription_id_prefix: shortId(subscriptionId),
      error_kind:             errorKind(err),
    });
    return NextResponse.json(
      { error: "Network error contacting Dodo" },
      { status: 502 },
    );
  }

  // Defensive extraction — try every plausible location
  const meta        = deepObj(dodoData, "metadata");
  const customData  = deepObj(dodoData, "custom_data");
  const metaCombined = { ...customData, ...meta };
  const metaUserId  = typeof metaCombined.user_id === "string" ? metaCombined.user_id
                    : typeof metaCombined.userId === "string" ? metaCombined.userId
                    : null;
  const customerObj = deepObj(dodoData, "customer");
  const customerEmail = deepStr(customerObj, ["email"]) ?? deepStr(dodoData, ["customer_email", "email"]);
  const productId   = deepStr(dodoData, ["product_id", "productId"]);
  const customerId  = deepStr(dodoData, ["customer_id", "customerId"]) ?? deepStr(customerObj, ["id", "customer_id"]);
  const statusRaw   = deepStr(dodoData, ["status"]);

  logEvent("info", "billing_sync_extracted_fields", {
    subscription_id_prefix: shortId(subscriptionId),
    meta_user_id_prefix:    shortId(metaUserId),
    has_customer_email:     Boolean(customerEmail),
    customer_id_prefix:     shortId(customerId),
    product_id_prefix:      shortId(productId),
    status:                 statusRaw,
  });

  // Ownership check: any one of these is sufficient
  const userEmail = (user.email ?? "").toLowerCase();
  const ownsByMeta       = typeof metaUserId === "string" && metaUserId === user.id;
  const ownsByEmail      = !!customerEmail && customerEmail.toLowerCase() === userEmail;
  const ownsByEmailHint  = !!emailHint && !!customerEmail && customerEmail.toLowerCase() === emailHint && emailHint === userEmail;

  // Fallback: existing billing_customer row with this customer_id already belongs to this user
  let ownsByExistingCustomer = false;
  if (customerId) {
    const { data: existingCustomer } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("dodo_customer_id", customerId)
      .eq("dodo_environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
      .maybeSingle();
    ownsByExistingCustomer = existingCustomer?.user_id === user.id;
  }

  if (!ownsByMeta && !ownsByEmail && !ownsByEmailHint && !ownsByExistingCustomer) {
    logEvent("warn", "billing_sync_ownership_mismatch", {
      user_id_prefix:         user.id.slice(0, 8),
      subscription_id_prefix: shortId(subscriptionId),
      meta_user_id_prefix:    shortId(metaUserId),
      has_customer_email:     Boolean(customerEmail),
      customer_id_prefix:     shortId(customerId),
    });
    return NextResponse.json(
      {
        error: "We couldn't confirm this subscription is yours.",
        details: {
          checkout_email_present: Boolean(customerEmail),
          hint: "If you paid with a different email than you signed in with, please contact support.",
        },
      },
      { status: 403 },
    );
  }

  // Determine plan
  let plan: BillingPlan | null = planFromProductId(productId);
  if (!plan && fallbackProduct && fallbackProduct in CHECKOUT_PRODUCTS) {
    plan = CHECKOUT_PRODUCTS[fallbackProduct].plan;
  }
  if (!plan || plan === "free") {
    logEvent("warn", "billing_sync_unknown_plan", {
      subscription_id_prefix: shortId(subscriptionId),
      product_id_prefix:      shortId(productId),
      fallback_product:       fallbackProduct || null,
    });
    return NextResponse.json({
      error: "Could not determine your plan from Dodo product. Contact support with subscription id.",
      productId: shortId(productId),
    }, { status: 422 });
  }

  const mappedStatus = statusMap(statusRaw);

  // Upsert customer
  if (customerId) {
    await admin.from("billing_customers").upsert({
      user_id:           user.id,
      dodo_customer_id:  customerId,
      dodo_environment:  serverEnv.DODO_PAYMENTS_ENVIRONMENT,
      billing_email:     customerEmail ?? user.email ?? null,
      currency:          deepStr(dodoData, ["currency"]) ?? "INR",
      updated_at:        new Date().toISOString(),
    });
  }

  // Upsert subscription
  await admin.from("subscriptions").upsert({
    user_id:                  user.id,
    provider:                 "dodo",
    environment:              serverEnv.DODO_PAYMENTS_ENVIRONMENT,
    provider_customer_id:     customerId,
    provider_subscription_id: subscriptionId,
    provider_product_id:      productId,
    plan,
    status:                   mappedStatus,
    current_period_start:     isoVal(dodoData, ["current_period_start", "period_start", "created_at"]),
    current_period_end:       isoVal(dodoData, ["current_period_end", "period_end", "next_billing_date", "expires_at"]),
    cancel_at_period_end:     Boolean(dodoData.cancel_at_period_end ?? dodoData.cancel_at_next_billing_date),
    cancelled_at:             isoVal(dodoData, ["cancelled_at", "canceled_at"]),
    metadata: {
      source: "authenticated_direct_sync",
      provider_status: statusRaw,
      product_id: productId,
    } as Json,
    updated_at:               new Date().toISOString(),
  }, { onConflict: "provider,environment,provider_subscription_id" });

  const entitlement = await refreshEntitlements(user.id);
  logEvent("info", "billing_sync_success", {
    user_id_prefix:         user.id.slice(0, 8),
    subscription_id_prefix: shortId(subscriptionId),
    plan:                   entitlement.plan,
    source:                 entitlement.source,
  });

  return NextResponse.json({
    ok:     true,
    plan:   entitlement.plan,
    source: "synced",
    status: mappedStatus,
  });
}
