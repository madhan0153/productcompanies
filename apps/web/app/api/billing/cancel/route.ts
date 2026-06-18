import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelActiveSubscription } from "@/lib/billing/cancel";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_cancel_ip", { limit: 20, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const userLimit = await rateLimitRoute(req, "billing_cancel", {
    limit: 6,
    windowMs: 10 * 60_000,
    userId: user.id,
  });
  if (userLimit) return userLimit;

  let body: { reason?: string; immediate?: boolean };
  try { body = await req.json(); } catch { body = {}; }
  if (body.immediate === true) {
    return NextResponse.json(
      { error: "Immediate cancellation is not supported. Access remains active until period end." },
      { status: 400 },
    );
  }

  const result = await cancelActiveSubscription({
    userId:    user.id,
    reason:    body.reason,
    immediate: false,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  // Refresh entitlement cache so the user's UI updates immediately
  await refreshEntitlements(user.id);
  return NextResponse.json({ ok: true, message: result.message });
}
