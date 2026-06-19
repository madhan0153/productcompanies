"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { CHECKOUT_PRODUCTS, type BillingPlan, type CheckoutProductId } from "@/lib/billing/catalog";
import type { Json, SubscriptionStatus } from "@/lib/supabase/types";
import { requireAdmin } from "../auth";
import { resolveUserResult, type ResolvedUser } from "../lookup";
import { recordAdminAction } from "../audit";

export interface ReconcileFormState {
  ok:       boolean;
  message:  string;
  input?: {
    subscriptionId: string;
    emailOrId: string;
    planOverride: string;
  };
  details?: {
    dodoShape?:   Record<string, unknown>;
    productId?:   string | null;
    plan?:        BillingPlan;
    status?:      SubscriptionStatus;
  };
}

interface UserCandidate {
  source: string;
  user: ResolvedUser;
}

function pickTarget(candidates: UserCandidate[]): {
  target: ResolvedUser | null;
  conflict: boolean;
  sources: string[];
} {
  const unique = new Map<string, UserCandidate>();
  for (const candidate of candidates) unique.set(candidate.user.id, candidate);
  return {
    target: unique.size === 1 ? [...unique.values()][0].user : null,
    conflict: unique.size > 1,
    sources: candidates.map((candidate) => candidate.source),
  };
}

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? v as Record<string, unknown> : {};
}

function deepStr(root: Record<string, unknown>, keys: string[]): string | null {
  const layers = [root, asRecord(root.data), asRecord(root.subscription), asRecord(root.object)];
  for (const layer of layers) {
    for (const k of keys) {
      const v = layer[k];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return null;
}

function deepObj(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const layers: unknown[] = [root[key], asRecord(root.data)[key], asRecord(root.subscription)[key]];
  for (const c of layers) {
    const r = asRecord(c);
    if (Object.keys(r).length > 0) return r;
  }
  return {};
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

function isoVal(root: Record<string, unknown>, keys: string[]): string | null {
  const raw = deepStr(root, keys);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function statusMap(s: string | null): SubscriptionStatus {
  switch ((s ?? "").toLowerCase()) {
    case "active":    return "active";
    case "trialing":  return "trialing";
    case "on_hold":   return "on_hold";
    case "past_due":  return "past_due";
    case "cancelled":
    case "canceled":  return "cancelled";
    case "expired":   return "expired";
    case "failed":    return "failed";
    default:          return "incomplete";
  }
}

function shortId(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length <= 10 ? `${value.slice(0, 4)}...` : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function dodoShape(data: Record<string, unknown>): Record<string, unknown> {
  return {
    key_count:        Object.keys(data).length,
    has_data:         Object.hasOwn(data, "data"),
    has_subscription: Object.hasOwn(data, "subscription"),
    has_customer:     Object.hasOwn(data, "customer"),
    has_metadata:     Object.hasOwn(data, "metadata"),
  };
}

/**
 * Admin tool — paste a subscription_id and an email/user_id, and we'll
 * fetch the subscription from Dodo, persist it, and grant entitlements
 * to that user. Bypasses webhook + return-URL plumbing entirely.
 */
export async function reconcileSubscription(
  _prev: ReconcileFormState,
  formData: FormData,
): Promise<ReconcileFormState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const subscriptionId = String(formData.get("subscriptionId") ?? "").trim();
  const emailOrId      = String(formData.get("emailOrId") ?? "").trim();
  const planOverrideValue = String(formData.get("planOverride") ?? "");
  const planOverride   = (planOverrideValue || null) as BillingPlan | null;
  const input = { subscriptionId, emailOrId, planOverride: planOverrideValue };

  if (!subscriptionId) return { ok: false, message: "subscription_id is required.", input };

  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return { ok: false, message: "DODO_PAYMENTS_API_KEY is not configured.", input };

  // Fetch Dodo first so account detection can use checkout metadata and the
  // provider customer instead of depending on a manually typed email.
  let dodoData: Record<string, unknown>;
  try {
    const url = `${dodoBaseUrl()}/subscriptions/${subscriptionId}`;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${apiKey}` }, cache: "no-store" });
    const txt = await res.text();
    if (!res.ok) {
      await recordAdminAction({
        actionType: "trigger_cron",
        targetRef: `reconcile:${shortId(subscriptionId)}`,
        status: "failed",
        metadata: { reason: "dodo_lookup_failed", http: res.status },
      });
      return { ok: false, message: `Dodo lookup failed with HTTP ${res.status}.`, input };
    }
    try {
      dodoData = asRecord(JSON.parse(txt));
    } catch {
      return { ok: false, message: "Dodo returned non-JSON response.", input };
    }
  } catch {
    return { ok: false, message: "Network error reaching Dodo.", input };
  }

  const customerObj = deepObj(dodoData, "customer");
  const metadata      = {
    ...deepObj(dodoData, "custom_data"),
    ...deepObj(dodoData, "metadata"),
  };
  const customerEmail = deepStr(customerObj, ["email"]) ?? deepStr(dodoData, ["customer_email", "email"]);
  const customerId    = deepStr(dodoData, ["customer_id", "customerId"]) ?? deepStr(customerObj, ["id", "customer_id"]);
  const productId     = deepStr(dodoData, ["product_id", "productId"]);
  const statusRaw     = deepStr(dodoData, ["status"]);
  const metadataUserId = deepStr(metadata, ["user_id", "userId"]);
  const sessionNonce   = deepStr(metadata, ["session_nonce"]);

  const supabaseAdmin = createSupabaseAdminClient();
  const candidates: UserCandidate[] = [];

  async function addAuthCandidate(source: string, identifier: string | null) {
    if (!identifier) return;
    const result = await resolveUserResult(identifier);
    if (result.error) throw new Error(`Supabase Auth lookup failed (${source}): ${result.error}`);
    if (result.user) candidates.push({ source, user: result.user });
  }

  try {
    await addAuthCandidate("Dodo metadata", metadataUserId);
    await addAuthCandidate("entered identifier", emailOrId || null);
    await addAuthCandidate("Dodo customer email", customerEmail);

    if (sessionNonce) {
      const checkoutResult = await supabaseAdmin
        .from("billing_checkout_sessions")
        .select("user_id")
        .eq("provider", "dodo")
        .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
        .eq("return_nonce", sessionNonce)
        .maybeSingle();
      if (checkoutResult.error) throw checkoutResult.error;
      await addAuthCandidate("checkout session", checkoutResult.data?.user_id ?? null);
    }

    if (customerId) {
      const customerResult = await supabaseAdmin
        .from("billing_customers")
        .select("user_id")
        .eq("dodo_customer_id", customerId)
        .eq("dodo_environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
        .maybeSingle();
      if (customerResult.error) throw customerResult.error;
      await addAuthCandidate("existing billing customer", customerResult.data?.user_id ?? null);
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not query Supabase for the customer account.",
      input,
    };
  }

  const selection = pickTarget(candidates);
  if (selection.conflict) {
    return {
      ok: false,
      message: "Account mismatch: Dodo and the entered identifier point to different ProdMatch users. Verify the customer's sign-in email before continuing.",
      input,
    };
  }
  const target = selection.target;
  if (!target) {
    return {
      ok: false,
      message: customerEmail
        ? `Dodo reports ${customerEmail}, but no matching ProdMatch account exists. Ask the customer which email they used to sign in, then enter it here.`
        : "Dodo did not provide account metadata or a customer email. Enter the exact ProdMatch sign-in email or user id.",
      input,
    };
  }

  const plan = planOverride ?? planFromProductId(productId);
  if (!plan || plan === "free") {
    return {
      ok: false,
      message: "Could not infer plan from the Dodo product id. Pick a plan override and try again.",
      input,
      details: { dodoShape: dodoShape(dodoData), productId: shortId(productId) },
    };
  }

  const mappedStatus = statusMap(statusRaw);

  if (customerId) {
    const customerUpsert = await supabaseAdmin.from("billing_customers").upsert({
      user_id:           target.id,
      dodo_customer_id:  customerId,
      dodo_environment:  serverEnv.DODO_PAYMENTS_ENVIRONMENT,
      billing_email:     customerEmail ?? target.email,
      currency:          deepStr(dodoData, ["currency"]) ?? "INR",
      updated_at:        new Date().toISOString(),
    });
    if (customerUpsert.error) {
      return { ok: false, message: "Could not save the Dodo customer record.", input };
    }
  }

  const subscriptionUpsert = await supabaseAdmin.from("subscriptions").upsert({
    user_id:                  target.id,
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
      source: "admin_reconciliation",
      provider_status: statusRaw,
      product_id: productId,
    } as Json,
    updated_at:               new Date().toISOString(),
  }, { onConflict: "provider,environment,provider_subscription_id" });
  if (subscriptionUpsert.error) {
    return { ok: false, message: "Could not save the subscription record.", input };
  }

  try {
    const entitlement = await refreshEntitlements(target.id);
    if ((mappedStatus === "active" || mappedStatus === "trialing") && entitlement.plan !== plan) {
      return { ok: false, message: "Subscription was saved, but entitlement activation did not complete.", input };
    }
  } catch {
    return { ok: false, message: "Subscription was saved, but entitlement refresh failed.", input };
  }

  await recordAdminAction({
    actionType:   "grant_entitlement",
    targetUserId: target.id,
    targetRef:    `reconcile:${shortId(subscriptionId)}`,
    metadata:     {
      plan,
      status: mappedStatus,
      hasCustomerEmail: Boolean(customerEmail),
      customerId: shortId(customerId),
      productId: shortId(productId),
      identitySources: selection.sources,
    },
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/users/${target.id}`);

  return {
    ok:      true,
    message: `${plan === "career_sprint" ? "Career Sprint" : "Pro"} (${mappedStatus}) reconciled to ${target.email}. Account verified via ${selection.sources.join(", ")}.`,
    input,
    details: { plan, status: mappedStatus },
  };
}
