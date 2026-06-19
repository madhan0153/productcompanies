import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillingPlan, CreditKind, Json, SubscriptionStatus } from "@/lib/supabase/types";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "./catalog";
import { grantCredits } from "./credits";
import { getDodoProductId } from "./dodo";
import { refreshEntitlements } from "./entitlements";
import { persistProviderSubscription } from "./subscriptions";
import { notifyUser } from "@/lib/push/notify";
import { serverEnv } from "@/lib/env";

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

function throwOnBillingError(result: { error: unknown }): void {
  if (result.error) throw result.error;
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

function statusFromEvent(type: string, data: Record<string, unknown>): SubscriptionStatus {
  const providerStatus = stringValue(data, ["status"])?.toLowerCase();
  if (providerStatus === "active") return "active";
  if (providerStatus === "on_hold" || providerStatus === "paused") return "on_hold";
  if (providerStatus === "past_due") return "past_due";
  if (providerStatus === "cancelled" || providerStatus === "canceled") return "cancelled";
  if (providerStatus === "expired") return "expired";
  if (providerStatus === "failed") return "failed";

  switch (type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.updated":
    case "subscription.plan_changed":
      return "active";
    case "subscription.on_hold":
    case "subscription.paused":
      return "on_hold";
    case "subscription.failed":
      return "failed";
    case "subscription.cancelled":
      return "cancelled";
    case "subscription.expired":
      return "expired";
    default:
      return "incomplete";
  }
}

function eventSnapshot(data: Record<string, unknown>): Json {
  const metadata = metadataFrom(data);
  return {
    customer_id: stringValue(data, ["customer_id", "customerId"]),
    subscription_id: stringValue(data, ["subscription_id", "subscriptionId"]),
    payment_id: stringValue(data, ["payment_id", "paymentId", "id"]),
    refund_id: stringValue(data, ["refund_id", "refundId"]),
    product_id: stringValue(data, ["product_id", "productId"]),
    status: stringValue(data, ["status"]),
    amount: numberValue(data, ["amount", "total_amount", "charged_amount"]),
    currency: stringValue(data, ["currency"]),
    metadata: {
      user_id: stringValue(metadata, ["user_id"]),
      checkout_product: stringValue(metadata, ["checkout_product"]),
      session_nonce: stringValue(metadata, ["session_nonce"]),
    },
  };
}

async function userIdFromPayload(data: Record<string, unknown>): Promise<string | null> {
  const metadata = metadataFrom(data);
  const userId = stringValue(metadata, ["user_id"]);
  if (userId) return userId;

  const sessionNonce = stringValue(metadata, ["session_nonce"]);
  const checkoutProduct = stringValue(metadata, ["checkout_product"]);
  if (sessionNonce) {
    let checkoutQuery = createSupabaseAdminClient()
      .from("billing_checkout_sessions")
      .select("user_id")
      .eq("provider", "dodo")
      .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
      .eq("return_nonce", sessionNonce);
    if (checkoutProduct && checkoutProduct in CHECKOUT_PRODUCTS) {
      checkoutQuery = checkoutQuery.eq("checkout_product", checkoutProduct);
    }
    const checkoutResult = await checkoutQuery.maybeSingle();
    throwOnBillingError(checkoutResult);
    if (checkoutResult.data?.user_id) return checkoutResult.data.user_id;
  }

  const customerId = stringValue(data, ["customer_id", "customerId", "customer"]);
  if (!customerId) return null;

  const admin = createSupabaseAdminClient();
  const customerResult = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("dodo_customer_id", customerId)
    .eq("dodo_environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
    .maybeSingle();
  throwOnBillingError(customerResult);
  const row = customerResult.data;
  return row?.user_id ?? null;
}

async function claimEvent(input: {
  webhookId: string;
  eventType: string;
  eventAt: string | null;
  data: Record<string, unknown>;
  userId: string | null;
}): Promise<"claimed" | "duplicate"> {
  const admin = createSupabaseAdminClient();
  const environment = serverEnv.DODO_PAYMENTS_ENVIRONMENT;
  const relatedCustomerId = stringValue(input.data, ["customer_id", "customerId"]);
  const relatedSubscriptionId = stringValue(input.data, ["subscription_id", "subscriptionId"]);
  const relatedPaymentId = stringValue(input.data, ["payment_id", "paymentId", "id"]);

  const insert = await admin.from("payment_events").insert({
    provider: "dodo",
    environment,
    provider_event_id: input.webhookId,
    event_type: input.eventType,
    user_id: input.userId,
    processing_status: "processing",
    provider_event_at: input.eventAt,
    related_customer_id: relatedCustomerId,
    related_subscription_id: relatedSubscriptionId,
    related_payment_id: relatedPaymentId,
    payload: eventSnapshot(input.data),
  });
  if (!insert.error) return "claimed";
  if (insert.error.code !== "23505") throw insert.error;

  const existingResult = await admin
    .from("payment_events")
    .select("processing_status, retry_count")
    .eq("provider", "dodo")
    .eq("environment", environment)
    .eq("provider_event_id", input.webhookId)
    .maybeSingle();
  throwOnBillingError(existingResult);
  const existing = existingResult.data;

  if (!existing || !["received", "failed"].includes(existing.processing_status)) return "duplicate";

  const retry = await admin
    .from("payment_events")
    .update({
      processing_status: "processing",
      processing_error: null,
      retry_count: existing.retry_count + 1,
      user_id: input.userId,
    })
    .eq("provider", "dodo")
    .eq("environment", environment)
    .eq("provider_event_id", input.webhookId)
    .in("processing_status", ["received", "failed"])
    .select("id")
    .maybeSingle();
  throwOnBillingError(retry);

  return retry.data ? "claimed" : "duplicate";
}

export async function processDodoWebhook(input: {
  webhookId: string;
  eventType: string;
  eventAt: string | null;
  payload: Json;
}): Promise<{ duplicate: boolean; userId: string | null }> {
  const admin = createSupabaseAdminClient();
  const payloadRecord = asRecord(input.payload);
  const data = asRecord(payloadRecord.data);
  const userId = await userIdFromPayload(data);
  const claim = await claimEvent({ ...input, data, userId });
  if (claim === "duplicate") return { duplicate: true, userId };

  let processingStatus = "processed";
  try {
    if (input.eventType.startsWith("subscription.")) {
      await handleSubscriptionEvent(input.eventType, data, userId, input.eventAt);
    } else if (input.eventType === "payment.succeeded") {
      await handlePayment(data, userId, "paid");
    } else if (input.eventType === "payment.failed") {
      await handlePayment(data, userId, "failed");
    } else if (input.eventType === "payment.processing") {
      await handlePayment(data, userId, "processing");
    } else if (input.eventType === "payment.cancelled") {
      await handlePayment(data, userId, "cancelled");
    } else if (input.eventType === "refund.succeeded") {
      await handleRefund(data, userId, "succeeded");
    } else if (input.eventType === "refund.failed") {
      await handleRefund(data, userId, "failed");
    } else if (input.eventType === "dispute.opened" || input.eventType === "dispute.lost") {
      await handleDispute(data, userId);
    } else {
      processingStatus = "ignored";
    }

    if (userId) await notifyBillingEvent(userId, input.eventType, input.webhookId);

    const processedUpdate = await admin
      .from("payment_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_status: processingStatus,
        processing_error: null,
        user_id: userId,
      })
      .eq("provider", "dodo")
      .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
      .eq("provider_event_id", input.webhookId);
    throwOnBillingError(processedUpdate);
  } catch (error) {
    const failedUpdate = await admin
      .from("payment_events")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        user_id: userId,
      })
      .eq("provider", "dodo")
      .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
      .eq("provider_event_id", input.webhookId);
    if (failedUpdate.error) {
      console.error("[billing-webhook] failed to persist processing failure", {
        code: failedUpdate.error.code,
      });
    }
    throw error;
  }

  return { duplicate: false, userId };
}

async function notifyBillingEvent(userId: string, eventType: string, webhookId: string) {
  const messages: Record<string, { title: string; body: string; priority?: "critical" | "important" }> = {
    "payment.succeeded": { title: "Payment successful", body: "Your ProdMatch payment was confirmed. Your receipt is available in billing." },
    "payment.failed": { title: "Payment needs attention", body: "We couldn’t complete your payment. Review your billing details when convenient.", priority: "critical" },
    "subscription.active": { title: "Subscription activated", body: "Your ProdMatch plan is active." },
    "subscription.renewed": { title: "Subscription renewed", body: "Your ProdMatch plan renewed successfully." },
    "subscription.on_hold": { title: "Subscription on hold", body: "A renewal needs attention. Update your payment method to keep access.", priority: "critical" },
    "subscription.failed": { title: "Subscription payment failed", body: "Your plan may be affected. Review billing to keep access uninterrupted.", priority: "critical" },
    "subscription.cancelled": { title: "Subscription cancelled", body: "Your cancellation is recorded. Billing shows when access ends." },
    "subscription.expired": { title: "Subscription expired", body: "Your paid access has ended. You can reactivate it from billing." },
    "refund.succeeded": { title: "Refund processed", body: "Your refund was processed. Settlement timing depends on your payment provider." },
  };
  const message = messages[eventType];
  if (!message) return;
  await notifyUser(userId, {
    type: "billing",
    title: message.title,
    body: message.body,
    url: "/settings/billing",
    priority: message.priority ?? "important",
    idempotencyKey: `billing:${webhookId}`,
    ttlSeconds: 3 * 24 * 60 * 60,
  }).catch(() => undefined);
}

async function handleSubscriptionEvent(
  eventType: string,
  data: Record<string, unknown>,
  userId: string | null,
  eventAt: string | null,
): Promise<void> {
  if (!userId) throw new Error("Subscription event could not be linked to a user.");
  const admin = createSupabaseAdminClient();
  const metadata = metadataFrom(data);
  const productId = stringValue(data, ["product_id", "productId"]) ?? stringValue(metadata, ["product_id"]);
  const plan = planFromProductId(productId);
  if (!plan || plan === "free") throw new Error("Subscription event has an unknown product.");

  const subscriptionId = stringValue(data, ["subscription_id", "subscriptionId", "id"]);
  if (!subscriptionId) throw new Error("Subscription event is missing subscription_id.");

  const environment = serverEnv.DODO_PAYMENTS_ENVIRONMENT;
  const existingResult = await admin
    .from("subscriptions")
    .select("last_provider_event_at")
    .eq("provider", "dodo")
    .eq("environment", environment)
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();
  throwOnBillingError(existingResult);
  const existing = existingResult.data;
  if (eventAt && existing?.last_provider_event_at && eventAt < existing.last_provider_event_at) return;

  const customerId = stringValue(data, ["customer_id", "customerId", "customer"]);
  if (customerId) {
    const customerUpsert = await admin.from("billing_customers").upsert({
      user_id: userId,
      dodo_customer_id: customerId,
      dodo_environment: environment,
      billing_email: stringValue(data, ["customer_email", "email"]),
      currency: stringValue(data, ["currency"]) ?? "INR",
      updated_at: new Date().toISOString(),
    });
    throwOnBillingError(customerUpsert);
  }

  await persistProviderSubscription({
    user_id: userId,
    provider: "dodo",
    environment,
    provider_customer_id: customerId,
    provider_subscription_id: subscriptionId,
    provider_product_id: productId,
    plan,
    status: statusFromEvent(eventType, data),
    current_period_start: isoValue(data, ["current_period_start", "period_start", "created_at"]),
    current_period_end: isoValue(data, ["current_period_end", "period_end", "next_billing_date", "expires_at"]),
    cancel_at_period_end: Boolean(data.cancel_at_period_end ?? data.cancel_at_next_billing_date),
    cancelled_at: isoValue(data, ["cancelled_at", "canceled_at"]),
    last_provider_event_at: eventAt,
    metadata: eventSnapshot(data),
    updated_at: new Date().toISOString(),
  });

  await refreshEntitlements(userId);
}

async function handlePayment(
  data: Record<string, unknown>,
  userId: string | null,
  status: "paid" | "failed" | "processing" | "cancelled",
): Promise<void> {
  if (!userId) throw new Error("Payment event could not be linked to a user.");
  const admin = createSupabaseAdminClient();
  const environment = serverEnv.DODO_PAYMENTS_ENVIRONMENT;
  const checkoutProduct = productFromMetadata(data);
  const product = checkoutProduct ? CHECKOUT_PRODUCTS[checkoutProduct] : null;
  const paymentId = stringValue(data, ["payment_id", "paymentId", "id"]);
  if (!paymentId) throw new Error("Payment event is missing payment_id.");

  const invoiceId = stringValue(data, ["invoice_id", "invoiceId"]);
  const invoiceValues = {
    user_id: userId,
    provider: "dodo" as const,
    environment,
    provider_invoice_id: invoiceId,
    provider_payment_id: paymentId,
    amount: numberValue(data, ["amount", "total_amount", "charged_amount"]) ?? product?.amountInPaise ?? 0,
    currency: stringValue(data, ["currency"]) ?? "INR",
    status,
    hosted_invoice_url: stringValue(data, ["invoice_url", "hosted_invoice_url"]),
    receipt_url: stringValue(data, ["receipt_url"]),
    is_verification: product?.verificationOnly === true,
    checkout_product: checkoutProduct,
    checkout_nonce: stringValue(metadataFrom(data), ["session_nonce"]),
    metadata: eventSnapshot(data),
    updated_at: new Date().toISOString(),
  };

  const existingResult = await admin
    .from("invoices")
    .select("id, status")
    .eq("provider", "dodo")
    .eq("environment", environment)
    .eq("provider_payment_id", paymentId)
    .maybeSingle();
  throwOnBillingError(existingResult);
  const existing = existingResult.data;
  if (existing) {
    throwOnBillingError(await admin.from("invoices").update(invoiceValues).eq("id", existing.id));
  } else {
    throwOnBillingError(await admin.from("invoices").insert(invoiceValues));
  }

  if (status === "paid" && checkoutProduct && product?.creditGrant) {
    await grantCredits({
      userId,
      kind: product.creditGrant.kind as CreditKind,
      amount: product.creditGrant.amount,
      reason: "credit_pack_purchase",
      referenceKey: `dodo:${environment}:${paymentId}`,
      metadata: eventSnapshot(data),
    });
  }

  if (status === "paid" && checkoutProduct) {
    const checkoutNonce = stringValue(metadataFrom(data), ["session_nonce"]);
    let checkoutUpdate = admin
      .from("billing_checkout_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("environment", environment)
      .eq("checkout_product", checkoutProduct)
      .in("status", ["creating", "open"]);
    if (checkoutNonce) checkoutUpdate = checkoutUpdate.eq("return_nonce", checkoutNonce);
    throwOnBillingError(await checkoutUpdate);
  }
}

async function handleRefund(
  data: Record<string, unknown>,
  userId: string | null,
  status: "succeeded" | "failed",
): Promise<void> {
  if (!userId) throw new Error("Refund event could not be linked to a user.");
  const admin = createSupabaseAdminClient();
  const environment = serverEnv.DODO_PAYMENTS_ENVIRONMENT;
  const refundId = stringValue(data, ["refund_id", "refundId", "id"]);
  if (!refundId) throw new Error("Refund event is missing refund_id.");
  const paymentId = stringValue(data, ["payment_id", "paymentId"]);
  const { data: invoice } = paymentId
    ? await admin
        .from("invoices")
        .select("id, checkout_product")
        .eq("provider", "dodo")
        .eq("environment", environment)
        .eq("provider_payment_id", paymentId)
        .maybeSingle()
    : { data: null };
  const values = {
    user_id: userId,
    invoice_id: invoice?.id ?? null,
    provider: "dodo" as const,
    environment,
    provider_refund_id: refundId,
    amount: numberValue(data, ["amount"]),
    currency: stringValue(data, ["currency"]) ?? "INR",
    status,
    reason: stringValue(data, ["reason"]),
    metadata: eventSnapshot(data),
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await admin
    .from("refunds")
    .select("id")
    .eq("provider", "dodo")
    .eq("environment", environment)
    .eq("provider_refund_id", refundId)
    .maybeSingle();
  if (existing) await admin.from("refunds").update(values).eq("id", existing.id);
  else await admin.from("refunds").insert(values);

  if (status === "succeeded" && invoice?.checkout_product && invoice.checkout_product in CHECKOUT_PRODUCTS) {
    const product = CHECKOUT_PRODUCTS[invoice.checkout_product as CheckoutProductId];
    if (product.creditGrant) {
      const reversal = await admin.from("credit_ledger").insert({
        user_id: userId,
        kind: product.creditGrant.kind,
        amount: -product.creditGrant.amount,
        reason: "credit_pack_refund",
        reference_key: `dodo_refund:${environment}:${refundId}`,
        metadata: eventSnapshot(data),
      });
      if (reversal.error && reversal.error.code !== "23505") throw reversal.error;
    }
  }

  const subscriptionId = stringValue(data, ["subscription_id", "subscriptionId"]);
  if (status === "succeeded" && subscriptionId) {
    await admin
      .from("subscriptions")
      .update({ status: "on_hold", updated_at: new Date().toISOString() })
      .eq("provider", "dodo")
      .eq("environment", environment)
      .eq("provider_subscription_id", subscriptionId)
      .eq("user_id", userId);
    await refreshEntitlements(userId);
  }
}

async function handleDispute(data: Record<string, unknown>, userId: string | null): Promise<void> {
  if (!userId) return;
  const subscriptionId = stringValue(data, ["subscription_id", "subscriptionId"]);
  if (!subscriptionId) return;
  const admin = createSupabaseAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "on_hold", updated_at: new Date().toISOString() })
    .eq("provider", "dodo")
    .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
    .eq("provider_subscription_id", subscriptionId)
    .eq("user_id", userId);
  await refreshEntitlements(userId);
}
