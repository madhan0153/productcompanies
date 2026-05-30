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
// Idempotent. Logs every step so Vercel logs show exactly what Dodo returned.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { CHECKOUT_PRODUCTS, type BillingPlan, type CheckoutProductId } from "@/lib/billing/catalog";
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
  ];
  for (const [key, envValue] of entries) {
    if (envValue && envValue === productId) return CHECKOUT_PRODUCTS[key].plan;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[billing/sync] 401: no user");
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { subscription_id?: string; product?: string; emailHint?: string };
  try { body = await req.json(); } catch { body = {}; }

  const subscriptionId   = body.subscription_id?.trim();
  const fallbackProduct  = (body.product ?? "") as CheckoutProductId;
  const emailHint        = body.emailHint?.trim().toLowerCase() ?? null;
  if (!subscriptionId) {
    console.log("[billing/sync] 400: no subscription_id");
    return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  }

  console.log("[billing/sync] start", {
    user_id:         user.id.slice(0, 8),
    subscription_id: subscriptionId,
    fallbackProduct,
  });

  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    console.log("[billing/sync] 500: API key not configured");
    return NextResponse.json({ error: "Billing not configured (DODO_PAYMENTS_API_KEY missing)" }, { status: 500 });
  }

  const admin = createSupabaseAdminClient();

  // Short-circuit: if we already have an active sub on this user, just refresh
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, user_id, plan, status")
    .eq("provider", "dodo")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existing && existing.user_id === user.id && existing.status === "active") {
    await refreshEntitlements(user.id);
    console.log("[billing/sync] cache hit", { plan: existing.plan });
    return NextResponse.json({ ok: true, plan: existing.plan, source: "cache" });
  }

  // Fetch from Dodo
  let dodoData: Record<string, unknown>;
  try {
    const url = `${dodoBaseUrl()}/subscriptions/${subscriptionId}`;
    console.log("[billing/sync] fetching", url);
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) {
      console.log("[billing/sync] dodo lookup failed", {
        status: res.status,
        body: txt.slice(0, 300),
      });
      return NextResponse.json(
        { error: `Dodo lookup failed: ${res.status} ${txt.slice(0, 200)}` },
        { status: 502 },
      );
    }
    try {
      dodoData = asRecord(JSON.parse(txt));
    } catch {
      console.log("[billing/sync] dodo returned non-JSON");
      return NextResponse.json({ error: "Dodo returned non-JSON response" }, { status: 502 });
    }
    // Log the top-level shape so we can debug Dodo's actual response format
    console.log("[billing/sync] dodo response keys", Object.keys(dodoData).slice(0, 30));
  } catch (err) {
    console.log("[billing/sync] network error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Network error contacting Dodo" },
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

  console.log("[billing/sync] extracted", {
    metaUserId,
    customerEmail,
    customerId,
    productId,
    statusRaw,
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
      .maybeSingle();
    ownsByExistingCustomer = existingCustomer?.user_id === user.id;
  }

  if (!ownsByMeta && !ownsByEmail && !ownsByEmailHint && !ownsByExistingCustomer) {
    console.log("[billing/sync] 403 ownership mismatch", {
      user_id:      user.id.slice(0, 8),
      has_meta_uid: !!metaUserId,
      has_cust_email: !!customerEmail,
      has_cust_id:  !!customerId,
    });
    return NextResponse.json(
      {
        error: "We couldn't confirm this subscription is yours.",
        details: {
          your_email:      userEmail,
          checkout_email:  customerEmail,
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
    console.log("[billing/sync] 422 unknown plan", { productId, fallbackProduct });
    return NextResponse.json({
      error: "Could not determine your plan from Dodo product. Contact support with subscription id.",
      productId,
    }, { status: 422 });
  }

  const mappedStatus = statusMap(statusRaw);

  // Upsert customer
  if (customerId) {
    await admin.from("billing_customers").upsert({
      user_id:           user.id,
      dodo_customer_id:  customerId,
      billing_email:     customerEmail ?? user.email ?? null,
      currency:          deepStr(dodoData, ["currency"]) ?? "INR",
      updated_at:        new Date().toISOString(),
    });
  }

  // Upsert subscription
  await admin.from("subscriptions").upsert({
    user_id:                  user.id,
    provider:                 "dodo",
    provider_customer_id:     customerId,
    provider_subscription_id: subscriptionId,
    provider_product_id:      productId,
    plan,
    status:                   mappedStatus,
    current_period_start:     isoVal(dodoData, ["current_period_start", "period_start", "created_at"]),
    current_period_end:       isoVal(dodoData, ["current_period_end", "period_end", "next_billing_date", "expires_at"]),
    cancel_at_period_end:     Boolean(dodoData.cancel_at_period_end ?? dodoData.cancel_at_next_billing_date),
    cancelled_at:             isoVal(dodoData, ["cancelled_at", "canceled_at"]),
    metadata:                 dodoData as unknown as Json,
    updated_at:               new Date().toISOString(),
  }, { onConflict: "provider,provider_subscription_id" });

  const entitlement = await refreshEntitlements(user.id);
  console.log("[billing/sync] success", { plan: entitlement.plan, source: entitlement.source });

  return NextResponse.json({
    ok:     true,
    plan:   entitlement.plan,
    source: "synced",
    status: mappedStatus,
  });
}
