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

  return (
    <main>
      <Hero />
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProdMatch.ai · Built for India · DPDP Act 2023 compliant</p>
      </footer>
    </main>
  );
}
