"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { CHECKOUT_PRODUCTS, type BillingPlan, type CheckoutProductId } from "@/lib/billing/catalog";
import type { Json, SubscriptionStatus } from "@/lib/supabase/types";
import { requireAdmin } from "../auth";
import { resolveUser } from "../lookup";
import { recordAdminAction } from "../audit";

export interface ReconcileFormState {
  ok:       boolean;
  message:  string;
  details?: {
    dodoResponse?: Record<string, unknown>;
    plan?:        BillingPlan;
    status?:      SubscriptionStatus;
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
    default:          return "active";
  }
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
  const planOverride   = (String(formData.get("planOverride") ?? "") || null) as BillingPlan | null;

  if (!subscriptionId) return { ok: false, message: "subscription_id is required." };
  if (!emailOrId)      return { ok: false, message: "Email or user id is required." };

  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return { ok: false, message: "DODO_PAYMENTS_API_KEY is not configured." };

  // Resolve target user
  const target = await resolveUser(emailOrId);
  if (!target) return { ok: false, message: `No user found for "${emailOrId}".` };

  // Fetch from Dodo
  let dodoData: Record<string, unknown>;
  try {
    const url = `${dodoBaseUrl()}/subscriptions/${subscriptionId}`;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${apiKey}` }, cache: "no-store" });
    const txt = await res.text();
    if (!res.ok) {
      await recordAdminAction({
        actionType: "trigger_cron", targetRef: `reconcile:${subscriptionId}`, status: "failed",
        metadata: { reason: "dodo_lookup_failed", http: res.status, body: txt.slice(0, 200) },
      });
      return { ok: false, message: `Dodo returned ${res.status}: ${txt.slice(0, 200)}` };
    }
    try {
      dodoData = asRecord(JSON.parse(txt));
    } catch {
      return { ok: false, message: "Dodo returned non-JSON response." };
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Network error reaching Dodo" };
  }

  const customerObj = deepObj(dodoData, "customer");
  const customerEmail = deepStr(customerObj, ["email"]) ?? deepStr(dodoData, ["customer_email", "email"]);
  const customerId    = deepStr(dodoData, ["customer_id", "customerId"]) ?? deepStr(customerObj, ["id", "customer_id"]);
  const productId     = deepStr(dodoData, ["product_id", "productId"]);
  const statusRaw     = deepStr(dodoData, ["status"]);

  const plan = planOverride ?? planFromProductId(productId);
  if (!plan || plan === "free") {
    return {
      ok: false,
      message: `Could not infer plan from product_id "${productId}". Pick a plan override and try again.`,
      details: { dodoResponse: dodoData },
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const mappedStatus = statusMap(statusRaw);

  if (customerId) {
    await supabaseAdmin.from("billing_customers").upsert({
      user_id:           target.id,
      dodo_customer_id:  customerId,
      billing_email:     customerEmail ?? target.email,
      currency:          deepStr(dodoData, ["currency"]) ?? "INR",
      updated_at:        new Date().toISOString(),
    });
  }

  await supabaseAdmin.from("subscriptions").upsert({
    user_id:                  target.id,
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

  await refreshEntitlements(target.id);

  await recordAdminAction({
    actionType:   "grant_entitlement",
    targetUserId: target.id,
    targetRef:    `reconcile:${subscriptionId}`,
    metadata:     { plan, status: mappedStatus, customerEmail, productId },
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/users/${target.id}`);

  return {
    ok:      true,
    message: `${plan === "career_sprint" ? "Career Sprint" : "Pro"} (${mappedStatus}) reconciled to ${target.email}.`,
    details: { plan, status: mappedStatus },
  };
}
