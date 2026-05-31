import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the billing/success page and billing settings to force-refresh
// the cached user_entitlements row after a webhook or promo activation.
export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "billing_refresh_ip", { limit: 60, windowMs: 10 * 60_000 });
  if (ipLimit) return ipLimit;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const userLimit = await rateLimitRoute(req, "billing_refresh", {
    limit: 20,
    windowMs: 10 * 60_000,
    userId: user.id,
  });
  if (userLimit) return userLimit;

  const entitlements = await refreshEntitlements(user.id);
  return NextResponse.json({ plan: entitlements.plan, source: entitlements.source });
}
