import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";
import { checkRateLimitShared, userActionKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 10 checkout session creations per hour per user — prevents quota exhaustion
  // against the Dodo Payments API.
  const limit = await checkRateLimitShared({
    key: userActionKey(user.id, "billing-checkout"),
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
