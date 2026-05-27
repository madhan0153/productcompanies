import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redeemPromoCode } from "@/lib/billing/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first to redeem a promo code." }, { status: 401 });
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
