import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan, CreditKind, Json, SubscriptionStatus } from "@/lib/supabase/types";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "./catalog";
import { grantCredits } from "./credits";
import { getDodoProductId } from "./dodo";
import { refreshEntitlements } from "./entitlements";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function numberValue(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function isoValue(obj: Record<string, unknown>, keys: string[]): string | null {
  const raw = stringValue(obj, keys);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function metadataFrom(data: Record<string, unknown>): Record<string, unknown> {
  return asRecord(data.metadata ?? data.custom_data ?? data.custom_fields);
}

function planFromProductId(productId: string | null): BillingPlan | null {
  if (!productId) return null;
  for (const [key, product] of Object.entries(CHECKOUT_PRODUCTS) as Array<[CheckoutProductId, typeof CHECKOUT_PRODUCTS[CheckoutProductId]]>) {
    if (getDodoProductId(key) === productId) return product.plan;
  }
  return null;
}

function productFromMetadata(data: Record<string, unknown>): CheckoutProductId | null {
  const value = stringValue(metadataFrom(data), ["checkout_product"]);
  if (!value || !(value in CHECKOUT_PRODUCTS)) return null;
  return value as CheckoutProductId;
}

function statusFromEvent(type: string): SubscriptionStatus {
  switch (type) {
    case "subscription.active":
    case "subscription.renewed":
      return "active";
    case "subscription.on_hold":
      return "on_hold";
    case "subscription.failed":
      return "failed";
    case "subscription.cancelled":
    case "subscription.canceled":
      return "cancelled";
    default:
      return "active";
  }
}

async function userIdFromPayload(data: Record<string, unknown>): Promise<string | null> {
  const metadata = metadataFrom(data);
  const userId = stringValue(metadata, ["user_id"]);
  if (userId) return userId;

  const customerId = stringValue(data, ["customer_id", "customerId", "customer"]);
  if (!customerId) return null;

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("dodo_customer_id", customerId)
    .maybeSingle();
  return row?.user_id ?? null;
}

export async function processDodoWebhook(input: {
  webhookId: string;
  eventType: string;
  payload: Json;
}): Promise<{ duplicate: boolean; userId: string | null }> {
  const admin = createSupabaseAdminClient();
  const payloadRecord = asRecord(input.payload);
  const data = asRecord(payloadRecord.data);
  const userId = await userIdFromPayload(data);

  const insert = await admin.from("payment_events").insert({
    provider: "dodo",
    provider_event_id: input.webhookId,
    event_type: input.eventType,
    user_id: userId,
    payload: input.payload,
  });

  if (insert.error) {
    const { data: existing } = await admin
      .from("payment_events")
      .select("processed_at, user_id")
      .eq("provider", "dodo")
      .eq("provider_event_id", input.webhookId)
      .maybeSingle();
    return { duplicate: true, userId: existing?.user_id ?? userId };
  }

  try {
    if (input.eventType.startsWith("subscription.")) {
      await handleSubscriptionEvent(input.eventType, data, userId);
    } else if (input.eventType === "payment.succeeded") {
      await handlePaymentSucceeded(data, userId);
    } else if (input.eventType === "payment.failed") {
      await handlePaymentFailed(data, userId);
    } else if (input.eventType === "refund.succeeded") {
      await handleRefundSucceeded(data, userId);
    }

    await admin
      .from("payment_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null, user_id: userId })
      .eq("provider", "dodo")
      .eq("provider_event_id", input.webhookId);
  } catch (error) {
    await admin
      .from("payment_events")
      .update({
        processing_error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        user_id: userId,
      })
      .eq("provider", "dodo")
      .eq("provider_event_id", input.webhookId);
    throw error;
  }

  return { duplicate: false, userId };
}

async function handleSubscriptionEvent(
  eventType: string,
  data: Record<string, unknown>,
  userId: string | null,
): Promise<void> {
  if (!userId) return;
  const admin = createSupabaseAdminClient();
  const metadata = metadataFrom(data);
  const productId = stringValue(data, ["product_id", "productId"]) ?? stringValue(metadata, ["product_id"]);
  const plan = planFromProductId(productId) ?? "pro";
  if (plan === "free") return;

  const customerId = stringValue(data, ["customer_id", "customerId", "customer"]);
  if (customerId) {
    await admin.from("billing_customers").upsert({
      user_id: userId,
      dodo_customer_id: customerId,
      billing_email: stringValue(data, ["customer_email", "email"]),
      currency: stringValue(data, ["currency"]) ?? "INR",
      updated_at: new Date().toISOString(),
    });
  }

  await admin.from("subscriptions").upsert({
    user_id: userId,
    provider: "dodo",
    provider_customer_id: customerId,
    provider_subscription_id: stringValue(data, ["subscription_id", "subscriptionId", "id"]),
    provider_product_id: productId,
    plan,
    status: statusFromEvent(eventType),
    current_period_start: isoValue(data, ["current_period_start", "period_start", "created_at"]),
    current_period_end: isoValue(data, ["current_period_end", "period_end", "next_billing_date", "expires_at"]),
    cancel_at_period_end: Boolean(data.cancel_at_period_end),
    cancelled_at: isoValue(data, ["cancelled_at", "canceled_at"]),
    metadata: data as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider,provider_subscription_id" });

  await refreshEntitlements(userId);
}

async function handlePaymentSucceeded(data: Record<string, unknown>, userId: string | null): Promise<void> {
  if (!userId) return;
  const admin = createSupabaseAdminClient();
  const checkoutProduct = productFromMetadata(data);
  const product = checkoutProduct ? CHECKOUT_PRODUCTS[checkoutProduct] : null;

  await admin.from("invoices").upsert({
    user_id: userId,
    provider: "dodo",
    provider_invoice_id: stringValue(data, ["invoice_id", "invoiceId"]),
    provider_payment_id: stringValue(data, ["payment_id", "paymentId", "id"]),
    amount: numberValue(data, ["amount", "total_amount", "charged_amount"]) ?? product?.amountInPaise ?? 0,
    currency: stringValue(data, ["currency"]) ?? "INR",
    status: "paid",
    hosted_invoice_url: stringValue(data, ["invoice_url", "hosted_invoice_url"]),
    receipt_url: stringValue(data, ["receipt_url"]),
    metadata: data as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider,provider_invoice_id" });

  if (checkoutProduct && product?.creditGrant) {
    await grantCredits({
      userId,
      kind: product.creditGrant.kind as CreditKind,
      amount: product.creditGrant.amount,
      reason: "credit_pack_purchase",
      referenceKey: `dodo:${stringValue(data, ["payment_id", "paymentId", "id"]) ?? checkoutProduct}`,
      metadata: data as unknown as Json,
    });
  }
}

async function handlePaymentFailed(data: Record<string, unknown>, userId: string | null): Promise<void> {
  if (!userId) return;
  const admin = createSupabaseAdminClient();
  await admin.from("invoices").insert({
    user_id: userId,
    provider: "dodo",
    provider_invoice_id: stringValue(data, ["invoice_id", "invoiceId"]),
    provider_payment_id: stringValue(data, ["payment_id", "paymentId", "id"]),
    amount: numberValue(data, ["amount", "total_amount", "charged_amount"]) ?? 0,
    currency: stringValue(data, ["currency"]) ?? "INR",
    status: "failed",
    metadata: data as unknown as Json,
  });
}

async function handleRefundSucceeded(data: Record<string, unknown>, userId: string | null): Promise<void> {
  if (!userId) return;
  const admin = createSupabaseAdminClient();
  await admin.from("refunds").insert({
    user_id: userId,
    provider: "dodo",
    provider_refund_id: stringValue(data, ["refund_id", "refundId", "id"]),
    amount: numberValue(data, ["amount"]),
    currency: stringValue(data, ["currency"]) ?? "INR",
    status: "succeeded",
    reason: stringValue(data, ["reason"]),
    metadata: data as unknown as Json,
  });
}
