import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";
import { getEntitlements } from "@/lib/billing/entitlements";
import { serverEnv } from "@/lib/env";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_status_ip", { limit: 90, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: { product?: string; session?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.product || !(body.product in CHECKOUT_PRODUCTS)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }
  if (!body.session || !/^[0-9a-f-]{36}$/i.test(body.session)) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
  }

  const product = body.product as CheckoutProductId;
  const config = CHECKOUT_PRODUCTS[product];
  const admin = createSupabaseAdminClient();
  const [entitlements, invoiceResult] = await Promise.all([
    getEntitlements(user.id),
    admin
      .from("invoices")
      .select("status, is_verification, created_at")
      .eq("user_id", user.id)
      .eq("environment", serverEnv.DODO_PAYMENTS_ENVIRONMENT)
      .eq("checkout_product", product)
      .eq("checkout_nonce", body.session)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (invoiceResult.error) {
    return NextResponse.json({ error: "Could not verify payment status." }, { status: 500 });
  }

  const paymentStatus = invoiceResult.data?.status ?? null;
  const confirmed = config.plan
    ? entitlements.plan !== "free" && paymentStatus === "paid"
    : paymentStatus === "paid";

  return NextResponse.json({
    confirmed,
    plan: entitlements.plan,
    paymentStatus,
    verificationOnly: config.verificationOnly === true,
  });
}
