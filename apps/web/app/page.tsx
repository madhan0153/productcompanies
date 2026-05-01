import { redirect } from "next/navigation";
import { Hero } from "@/components/hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // If user is already authenticated, send them to the app instead of the marketing page.
  // This also catches the case where Supabase OAuth redirects back to the site URL
  // (instead of /auth/callback) when the redirect URL allowlist is misconfigured.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // Fetch live counts + logos for the hero. RLS allows anonymous reads on
  // companies and active jobs, so this works pre-auth.
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: companies }, { count: jobCount }, { count: newToday }] = await Promise.all([
    supabase
      .from("companies")
      .select("name, slug, logo_url")
      .order("name"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
  ]);

  return (
    <main>
      <Hero
        companies={(companies ?? []).map((c) => ({
          name: c.name,
          slug: c.slug,
          logoUrl: c.logo_url,
        }))}
        liveStats={{
          activeJobs: jobCount ?? 0,
          newToday: newToday ?? 0,
        }}
      />
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProdMatch.ai · Built for India · DPDP Act 2023 compliant</p>
      </footer>
    </main>
  );
}
