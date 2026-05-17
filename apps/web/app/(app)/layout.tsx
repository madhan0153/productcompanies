import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { FreshnessBanner } from "@/components/freshness-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const since7d = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const stuckSince = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  // Sprint 6 — badge counts for the mobile bottom nav. Cheap head-counts.
  const [{ data: profile }, unseenStrong, stuckApps] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, product_dna_score")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("verdict", "strong_fit")
      .is("seen_at", null),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "applied")
      .lt("applied_at", stuckSince),
  ]);
  void since7d;

  const navBadges = {
    matches: unseenStrong.count ?? 0,
    applications: stuckApps.count ?? 0,
  };

  return (
    <AppShell
      user={{ email: user.email ?? "", displayName: profile?.display_name ?? null, dnascore: profile?.product_dna_score ?? null }}
      navBadges={navBadges}
      banner={
        <Suspense fallback={null}>
          <FreshnessBanner />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
