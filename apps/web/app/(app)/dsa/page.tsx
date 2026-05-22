import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Clock3, Layers, Target } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo/site";
import { DsaClient, type DsaHistoryRow, type DsaProgressRow } from "./dsa-client";

// SEO: DSA practice is intentionally public — pattern + problem content
// is rankable evergreen material. Per-user state (streak, history,
// confidence ratings) only renders when a user is signed in.
export const metadata: Metadata = {
  title: "DSA Practice — 17 Patterns + Problems in TS, Python, Java",
  description: "Free DSA practice for product-company interviews. 17 algorithmic patterns + hand-curated problems with TypeScript, Python and Java solutions, complexity analysis, and spaced-repetition tracking.",
  alternates: { canonical: "/dsa" },
  openGraph: {
    title: "DSA Practice — Product-Company Interview Prep",
    description: "Free, India-first DSA practice with TS/Py/Java solutions for product-company interviews.",
    url: absoluteUrl("/dsa"),
  },
};
export const dynamic = "force-dynamic";

export default async function DsaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // SEO: anonymous users see the same content (patterns + problem catalog)
  // without per-user history. Sign-in adds streak, progress, and the
  // spaced-repetition tracker.
  const [profile, history, progress] = user
    ? await Promise.all([
        loadProfileResumeState(supabase, user.id),
        loadDsaHistory(supabase, user.id),
        loadDsaProgressRows(supabase, user.id),
      ])
    : [null, [] as DsaHistoryRow[], [] as DsaProgressRow[]];

  const hasResume = Boolean(profile?.resume_parsed);
  const isAuthed = Boolean(user);

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

      {isAuthed ? (
        <DsaClient history={history ?? []} progress={progress ?? []} hasResume={hasResume} />
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm font-semibold">
            Sign in to track your streak, save confidence ratings, and get personalised picks.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Free. No credit card. The 17 patterns and every problem are accessible without an account too.
          </p>
          <Link
            href="/auth/login?next=/dsa"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      )}
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
