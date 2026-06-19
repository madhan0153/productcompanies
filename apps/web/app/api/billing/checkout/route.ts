import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createDodoCheckoutSession,
  DodoApiError,
  getDodoProductCatalogDiagnostic,
} from "@/lib/billing/dodo";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import { logEvent } from "@/lib/observability/log";
import { serverEnv } from "@/lib/env";
import { safeInternalPath } from "@/lib/auth/redirect";
import { isPaymentVerificationEnabledForEmail } from "@/lib/billing/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BILLING_DIAGNOSTIC_TOKEN_HASH =
  "e3ea9d135929244cf48963555bd394aad82e351ba59d2b503fc422f84e87a064";

function hasBillingDiagnosticAccess(req: NextRequest): boolean {
  const token = req.headers.get("x-billing-diagnostic");
  if (!token) return false;
  const actual = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const expected = Buffer.from(BILLING_DIAGNOSTIC_TOKEN_HASH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_checkout_ip", { limit: 20, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const userLimit = await rateLimitRoute(req, "billing_checkout", {
    limit: 8,
    windowMs: 10 * 60_000,
    userId: user.id,
  });
  if (userLimit) return userLimit;

  let body: { product?: string; returnTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { product, returnTo } = body;
  if (!product || !(product in CHECKOUT_PRODUCTS)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }
  const checkoutProduct = product as CheckoutProductId;
  const productConfig = CHECKOUT_PRODUCTS[checkoutProduct];
  const safeReturnTo = typeof returnTo === "string"
    ? safeInternalPath(returnTo, "/dashboard")
    : undefined;

  // Require sign-in before checkout — user.email is always present for auth users
  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "Account has no email address." }, { status: 400 });
  }

  if (productConfig.verificationOnly && !isPaymentVerificationEnabledForEmail(email)) {
    return NextResponse.json({ error: "This verification purchase is not available." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const environment = serverEnv.DODO_PAYMENTS_ENVIRONMENT;

  if (productConfig.plan) {
    const { data: activeSubscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", environment)
      .in("status", ["active", "trialing", "on_hold", "past_due"])
      .limit(1)
      .maybeSingle();
    if (activeSubscription) {
      return NextResponse.json(
        { error: "You already have a subscription. Manage it from Billing.", code: "active_subscription" },
        { status: 409 },
      );
    }
  }

  if (productConfig.verificationOnly) {
    const { count } = await admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("environment", environment)
      .eq("is_verification", true)
      .eq("status", "paid");
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "This account has already completed a verification payment.", code: "already_verified" },
        { status: 409 },
      );
    }
  }

  const recentCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: existingSession } = await admin
    .from("billing_checkout_sessions")
    .select("checkout_url, status")
    .eq("user_id", user.id)
    .eq("environment", environment)
    .eq("checkout_product", checkoutProduct)
    .in("status", ["creating", "open"])
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSession?.checkout_url) {
    return NextResponse.json({ checkoutUrl: existingSession.checkout_url, reused: true });
  }
  if (existingSession?.status === "creating") {
    return NextResponse.json(
      { error: "Checkout is already being prepared. Please try again in a few seconds.", code: "checkout_pending" },
      { status: 409 },
    );
  }

  const idempotencyKey = `prodmatch:${environment}:${user.id}:${checkoutProduct}:${Math.floor(Date.now() / 900_000)}`;
  const returnNonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const checkoutRecord = await admin.from("billing_checkout_sessions").insert({
    user_id: user.id,
    provider: "dodo",
    environment,
    checkout_product: checkoutProduct,
    return_nonce: returnNonce,
    idempotency_key: idempotencyKey,
    status: "creating",
    expires_at: expiresAt,
  }).select("id").single();

  if (checkoutRecord.error && checkoutRecord.error.code !== "23505") {
    logEvent("error", "billing_checkout_reservation_failed", {
      user_id_prefix: user.id.slice(0, 8),
      checkout_product: checkoutProduct,
      environment,
      error_code: checkoutRecord.error.code,
    });
    return NextResponse.json(
      { error: "Checkout could not be reserved. Please try again.", code: "checkout_failed" },
      { status: 500 },
    );
  }

  let checkoutRecordId = checkoutRecord.data?.id ?? null;
  if (!checkoutRecordId) {
    const recovered = await admin
      .from("billing_checkout_sessions")
      .update({
        return_nonce: returnNonce,
        status: "creating",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "dodo")
      .eq("environment", environment)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    checkoutRecordId = recovered.data?.id ?? null;
  }

  if (!checkoutRecordId) {
    return NextResponse.json(
      { error: "Checkout is already being prepared. Please try again.", code: "checkout_pending" },
      { status: 409 },
    );
  }

  try {
    const session = await createDodoCheckoutSession({
      product:  checkoutProduct,
      userId:   user.id,
      email,
      returnTo: safeReturnTo,
      idempotencyKey,
      returnNonce,
    });
    await admin.from("billing_checkout_sessions").update({
      provider_session_id: session.session_id,
      checkout_url: session.checkout_url,
      status: "open",
      updated_at: new Date().toISOString(),
    }).eq("id", checkoutRecordId);
    logEvent("info", "billing_checkout_created", {
      user_id_prefix: user.id.slice(0, 8),
      checkout_product: checkoutProduct,
      environment,
      session_id_prefix: session.session_id.slice(0, 12),
    });
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (err) {
    await admin.from("billing_checkout_sessions").update({
      status: "failed",
      updated_at: new Date().toISOString(),
    }).eq("id", checkoutRecordId);
    let catalogDiagnostic: { status: number; summary: string } | null = null;
    if (
      err instanceof DodoApiError &&
      err.status === 422 &&
      err.providerMessage.includes("does not exist")
    ) {
      try {
        const catalog = await getDodoProductCatalogDiagnostic();
        catalogDiagnostic = catalog;
        logEvent("warn", "billing_dodo_catalog_mismatch", {
          provider_status: catalog.status,
          catalog_summary: catalog.summary,
        });
      } catch (catalogError) {
        logEvent("warn", "billing_dodo_catalog_lookup_failed", {
          error_kind: catalogError instanceof Error ? catalogError.name : "unknown",
        });
      }
    }
    // Distinguish "env not wired yet" from generic checkout failures. The
    // client uses the code to dim that specific plan for the rest of the
    // session and swap copy to "Coming soon" instead of a scary banner.
    const isUnavailable = err instanceof Error && /is not configured/.test(err.message);
    logEvent("warn", "billing_checkout_failed", {
      user_id_prefix: user.id.slice(0, 8),
      checkout_product: checkoutProduct,
      environment,
      error_kind: err instanceof Error ? err.name : "unknown",
      provider_status: err instanceof DodoApiError ? err.status : undefined,
      provider_code: err instanceof DodoApiError ? err.providerCode : undefined,
      provider_message: err instanceof DodoApiError ? err.providerMessage : undefined,
      code: isUnavailable ? "unavailable" : "checkout_failed",
    });
    return NextResponse.json(
      {
        error: isUnavailable
          ? "This plan isn't available yet. Please pick another or check back soon."
          : "We couldn't start checkout. Please try again in a moment.",
        code: isUnavailable ? "unavailable" : "checkout_failed",
        diagnostic: catalogDiagnostic && hasBillingDiagnosticAccess(req)
          ? catalogDiagnostic
          : undefined,
      },
      { status: isUnavailable ? 503 : 500 },
    );
  }
}
