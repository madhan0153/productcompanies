import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import { logEvent } from "@/lib/observability/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  // Only accept same-origin paths (no external redirects)
  const safeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : undefined;

  // Require sign-in before checkout — user.email is always present for auth users
  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "Account has no email address." }, { status: 400 });
  }

  try {
    const session = await createDodoCheckoutSession({
      product:  product as CheckoutProductId,
      userId:   user.id,
      email,
      returnTo: safeReturnTo,
    });
    return NextResponse.json({ checkoutUrl: session.checkout_url });
  } catch (err) {
    // Distinguish "env not wired yet" from generic checkout failures. The
    // client uses the code to dim that specific plan for the rest of the
    // session and swap copy to "Coming soon" instead of a scary banner.
    const isUnavailable = err instanceof Error && /is not configured/.test(err.message);
    logEvent("warn", "billing_checkout_failed", {
      user_id_prefix: user.id.slice(0, 8),
      error_kind: err instanceof Error ? err.name : "unknown",
      code: isUnavailable ? "unavailable" : "checkout_failed",
    });
    return NextResponse.json(
      {
        error: isUnavailable
          ? "This plan isn't available yet. Please pick another or check back soon."
          : "We couldn't start checkout. Please try again in a moment.",
        code: isUnavailable ? "unavailable" : "checkout_failed",
      },
      { status: isUnavailable ? 503 : 500 },
    );
  }
}
