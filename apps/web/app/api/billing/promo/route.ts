import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redeemPromoCode } from "@/lib/billing/promo";
import { checkRateLimitShared, userActionKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first to redeem a promo code." }, { status: 401 });
  }

  // 10 attempts per hour per user — prevents brute-forcing short promo codes.
  const limit = await checkRateLimitShared({
    key: userActionKey(user.id, "promo-redeem"),
    limit: 10,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body.code ?? "").trim();
  if (!raw || raw.length < 4 || raw.length > 64) {
    return NextResponse.json({ error: "Please enter a valid promo code." }, { status: 400 });
  }

  const result = await redeemPromoCode(user.id, raw);

  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: result.message, grantType: result.grantType });
}
