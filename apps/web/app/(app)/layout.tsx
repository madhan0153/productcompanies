import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { FreshnessBanner } from "@/components/freshness-banner";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { getUserUsage } from "@/lib/billing/usage";

// SEO: DSA practice URLs sit inside the (app) route group for code colocation
// but should be readable without authentication so search engines + AI tools
// can index the pattern/problem content. For these paths we skip the redirect
// and render the public chrome instead of the authed AppShell.
const PUBLIC_PATH_PREFIXES = ["/dsa"];

function isPublicAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hdrs = await headers();
  const pathname = hdrs.get("x-prodmatch-pathname");
  const isPublicPath = isPublicAppPath(pathname);

  if (!user) {
    // Anonymous DSA viewer — render with the public chrome (sticky nav +
    // dense-link footer) instead of the authed AppShell. This keeps the
    // page indexable + AI-citable without auth. Any other unauth path
    // falls through to the auth-login redirect below.
    if (isPublicPath) {
      return (
        <div className="min-h-screen bg-background">
          <PublicNav />
          <main className="mx-auto max-w-5xl px-4 pt-6 pb-10 sm:px-6">
            {children}
          </main>
          <PublicFooter />
        </div>
      );
    }
    redirect("/auth/login");
  }

  const since7d = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const stuckSince = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  // Sprint 6 — badge counts for the mobile bottom nav. Cheap head-counts.
  const [{ data: profile }, unseenStrong, stuckApps, usage] = await Promise.all([
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
    getUserUsage(user.id).catch(() => null),
  ]);
  void since7d;

  const navBadges = {
    matches: unseenStrong.count ?? 0,
    applications: stuckApps.count ?? 0,
  };

  const tailorMetric = usage?.metrics.find((m) => m.key === "tailored");
  const usageProp = usage && tailorMetric ? {
    plan:          usage.plan,
    tailorUsed:    tailorMetric.used,
    tailorLimit:   tailorMetric.unlimited ? 9999 : (tailorMetric.limit as number),
    tailorCredits: usage.credits.tailored,
  } : undefined;

  return (
    <AppShell
      user={{ email: user.email ?? "", displayName: profile?.display_name ?? null, dnascore: profile?.product_dna_score ?? null }}
      navBadges={navBadges}
      usage={usageProp}
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
