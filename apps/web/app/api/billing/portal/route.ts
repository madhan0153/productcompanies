import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientEnv, serverEnv } from "@/lib/env";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import { logEvent } from "@/lib/observability/log";
import { assertDodoEnvironmentConfiguration } from "@/lib/billing/dodo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dodoBaseUrl(): string {
  if (serverEnv.DODO_PAYMENTS_BASE_URL) return serverEnv.DODO_PAYMENTS_BASE_URL.replace(/\/$/, "");
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_portal_ip", { limit: 20, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userLimit = await rateLimitRoute(req, "billing_portal", {
    limit: 8,
    windowMs: 10 * 60_000,
    userId: user.id,
  });
  if (userLimit) return userLimit;

  if (!serverEnv.DODO_PAYMENTS_API_KEY) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }
  try {
    assertDodoEnvironmentConfiguration();
  } catch {
    return NextResponse.json({ error: "Billing environment configuration is invalid." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  const { data: customer } = await admin
    .from("billing_customers")
    .select("dodo_customer_id")
    .eq("user_id", user.id)
    .eq("dodo_environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
    .maybeSingle();
  if (!customer?.dodo_customer_id) {
    return NextResponse.json({ error: "No Dodo billing customer is linked to this account." }, { status: 404 });
  }

  const endpoint = new URL(
    `/customers/${encodeURIComponent(customer.dodo_customer_id)}/customer-portal/session`,
    dodoBaseUrl(),
  );
  endpoint.searchParams.set("return_url", new URL("/settings/billing", clientEnv.NEXT_PUBLIC_APP_URL).toString());

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.DODO_PAYMENTS_API_KEY}` },
    });
    if (!response.ok) {
      logEvent("warn", "billing_portal_provider_failed", {
        user_id_prefix: user.id.slice(0, 8),
        status: response.status,
      });
      return NextResponse.json({ error: "Could not open the billing portal." }, { status: 502 });
    }
    const payload = await response.json() as { link?: string };
    if (!payload.link) {
      return NextResponse.json({ error: "Dodo did not return a portal link." }, { status: 502 });
    }
    logEvent("info", "billing_portal_created", { user_id_prefix: user.id.slice(0, 8) });
    return NextResponse.json({ url: payload.link });
  } catch (error) {
    logEvent("error", "billing_portal_failed", {
      user_id_prefix: user.id.slice(0, 8),
      error_kind: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
