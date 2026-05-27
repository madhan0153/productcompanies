import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshEntitlements } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the billing/success page and billing settings to force-refresh
// the cached user_entitlements row after a webhook or promo activation.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const entitlements = await refreshEntitlements(user.id);
  return NextResponse.json({ plan: entitlements.plan, source: entitlements.source });
}
