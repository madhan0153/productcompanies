import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brain, Clock3, Target } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DsaClient, type DsaHistoryRow } from "./dsa-client";

export const metadata: Metadata = { title: "DSA Practice · ProdMatch" };
export const dynamic = "force-dynamic";

export default async function DsaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: history }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>),
    (supabase
      .from("interview_daily_dispatch")
      .select("day, problem_slug, personalised_note, is_complete")
      .eq("user_id", user.id)
      .order("day", { ascending: false })
      .limit(45) as unknown as Promise<{ data: DsaHistoryRow[] | null }>),
  ]);

  const hasResume = Boolean(profile?.resume_parsed);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Interview practice</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">DSA Practice</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              One product-company style problem per day with the question, approach, clean solution, and progress tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <HeroStat icon={<Target className="h-4 w-4" />} label="Plan" value="Daily" />
          <HeroStat icon={<Clock3 className="h-4 w-4" />} label="Session" value="20-45m" />
          <HeroStat icon={<Brain className="h-4 w-4" />} label="Mode" value={hasResume ? "Tuned" : "Core"} />
        </div>
      </header>

      <DsaClient history={history ?? []} hasResume={hasResume} />
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="truncate text-sm font-semibold">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
