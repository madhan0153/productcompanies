// /api/billing/diagnose — admin-only.
// Returns the billing config the server actually sees, so you can verify
// without guessing whether NEXT_PUBLIC_APP_URL, product IDs, and the
// Dodo base URL are wired correctly.

import { NextResponse } from "next/server";
import { serverEnv, clientEnv } from "@/lib/env";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

function mask(v: string | undefined | null): string {
  if (!v) return "(unset)";
  if (v.length <= 8) return "•••";
  return `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)`;
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.isAdmin) return NextResponse.json({ error: "not allowed" }, { status: 404 });

  const appUrl  = clientEnv.NEXT_PUBLIC_APP_URL;
  const returnUrl = new URL("/billing/success", appUrl).toString();
  const cancelUrl = new URL("/pricing", appUrl).toString();
  const webhookExpected = new URL("/api/webhooks/dodo", appUrl).toString();

  // Hit Dodo with a cheap auth check (list 1 sub) to validate the key
  let dodoAuthOk = false;
  let dodoAuthError: string | null = null;
  if (serverEnv.DODO_PAYMENTS_API_KEY) {
    try {
      const res = await fetch(`${dodoBaseUrl()}/subscriptions?page_size=1`, {
        headers: { "Authorization": `Bearer ${serverEnv.DODO_PAYMENTS_API_KEY}` },
        cache: "no-store",
      });
      dodoAuthOk = res.ok;
      if (!res.ok) dodoAuthError = `HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
    } catch (err) {
      dodoAuthError = err instanceof Error ? err.message : "network error";
    }
  }

  return NextResponse.json({
    app: {
      NEXT_PUBLIC_APP_URL: appUrl,
      returnUrl,
      cancelUrl,
      webhookEndpointToSetInDodo: webhookExpected,
    },
    dodo: {
      environment: serverEnv.DODO_PAYMENTS_ENVIRONMENT,
      baseUrl:     dodoBaseUrl(),
      apiKey:      mask(serverEnv.DODO_PAYMENTS_API_KEY),
      webhookKey:  mask(serverEnv.DODO_PAYMENTS_WEBHOOK_KEY),
      authProbe:   { ok: dodoAuthOk, error: dodoAuthError },
    },
    products: {
      pro_monthly:           mask(serverEnv.DODO_PRODUCT_PRO_MONTHLY_ID),
      pro_yearly:            mask(serverEnv.DODO_PRODUCT_PRO_YEARLY_ID),
      career_sprint_monthly: mask(serverEnv.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID),
      career_sprint_yearly:  mask(serverEnv.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID),
      tailor_credits_50:     mask(serverEnv.DODO_PRODUCT_TAILOR_CREDITS_50_ID),
    },
    notes: [
      "If returnUrl is localhost, NEXT_PUBLIC_APP_URL is misconfigured in Vercel.",
      "webhookEndpointToSetInDodo is the URL you must paste into Dodo dashboard → Webhooks → New endpoint.",
      "Subscribe the endpoint to: subscription.active, subscription.renewed, subscription.cancelled, subscription.on_hold, subscription.failed, payment.succeeded, payment.failed, refund.succeeded.",
      "After paying in Dodo test mode, check that you return to returnUrl (not localhost).",
    ],
  });
}
