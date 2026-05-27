import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelActiveSubscription } from "@/lib/billing/cancel";
import { refreshEntitlements } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: { reason?: string; immediate?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  const result = await cancelActiveSubscription({
    userId:    user.id,
    reason:    body.reason,
    immediate: body.immediate === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  // Refresh entitlement cache so the user's UI updates immediately
  await refreshEntitlements(user.id);
  return NextResponse.json({ ok: true, message: result.message });
}
