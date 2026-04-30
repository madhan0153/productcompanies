import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error?.message ?? "auth_failed")}`,
    );
  }

  const userId = data.user.id;

  // Bootstrap profile row on first sign-in
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    const displayName =
      data.user.user_metadata?.full_name ??
      data.user.user_metadata?.name ??
      data.user.email?.split("@")[0] ??
      null;

    await supabase.from("profiles").insert({
      id: userId,
      display_name: displayName,
    });

    // Default weekly digest subscription
    await supabase.from("digest_subscriptions").insert({
      user_id: userId,
      frequency: "weekly",
    });
  }

  // Check whether the user has given the mandatory 'account' consent
  const { data: accountConsent } = await supabase
    .from("consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", "account")
    .eq("policy_version", serverEnv.DPDP_POLICY_VERSION)
    .maybeSingle();

  const needsConsent = !accountConsent?.granted;

  const redirectPath = needsConsent
    ? `/consent?next=${encodeURIComponent(next)}`
    : next.startsWith("/") ? next : "/dashboard";

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
