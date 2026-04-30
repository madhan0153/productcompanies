import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, product_dna_score")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell
      user={{ email: user.email ?? "", displayName: profile?.display_name ?? null, dnascore: profile?.product_dna_score ?? null }}
    >
      {children}
    </AppShell>
  );
}
