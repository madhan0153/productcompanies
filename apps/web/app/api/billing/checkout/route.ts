import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDodoCheckoutSession } from "@/lib/billing/dodo";
import { CHECKOUT_PRODUCTS, type CheckoutProductId } from "@/lib/billing/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { product?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { product } = body;
  if (!product || !(product in CHECKOUT_PRODUCTS)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  // Require sign-in before checkout — user.email is always present for auth users
  const email = user.email;
  if (!email) {
    return NextResponse.json({ error: "Account has no email address." }, { status: 400 });
  }

  try {
    const session = await createDodoCheckoutSession({
      product: product as CheckoutProductId,
      userId:  user.id,
      email,
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
