import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brain, Clock3, Layers, Target } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DsaClient, type DsaHistoryRow, type DsaProgressRow } from "./dsa-client";

export const metadata: Metadata = { title: "DSA Practice · ProdMatch" };
export const dynamic = "force-dynamic";

export default async function DsaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [profile, history, progress] = await Promise.all([
    loadProfileResumeState(supabase, user.id),
    loadDsaHistory(supabase, user.id),
    loadDsaProgressRows(supabase, user.id),
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

        <Link
          href="/dsa/patterns"
          className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-secondary/50 sm:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Browse all 17 patterns
          </span>
          <span className="text-xs text-muted-foreground">Roadmap order →</span>
        </Link>
      </header>

      <DsaClient history={history ?? []} progress={progress ?? []} hasResume={hasResume} />
    </div>
  );
}

async function loadProfileResumeState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<{ resume_parsed: unknown } | null> {
  try {
    const { data } = await (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", userId)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>);
    return data ?? null;
  } catch {
    return null;
  }
}

async function loadDsaHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<DsaHistoryRow[]> {
  try {
    const { data } = await (supabase
      .from("interview_daily_dispatch")
      .select("day, problem_slug, personalised_note, is_complete")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(60) as unknown as Promise<{ data: DsaHistoryRow[] | null }>);
    return data ?? [];
  } catch {
    return [];
  }
}

async function loadDsaProgressRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<DsaProgressRow[]> {
  try {
    const { data } = await (supabase
      .from("dsa_user_progress")
      .select("problem_slug, confidence, next_review_at, last_reviewed_on, repetitions")
      .eq("user_id", userId)
      .order("next_review_at", { ascending: true })
      .limit(200) as unknown as Promise<{ data: DsaProgressRow[] | null }>);
    return data ?? [];
  } catch {
    return [];
  }
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
