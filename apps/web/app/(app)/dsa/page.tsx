import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Sparkles, ShieldCheck, Clock3, Flame, Trophy, Snowflake, CornerUpRight, Building2, Plus, ArrowRight } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getDsaDailyState, ensureTodayAssigned, fetchLast7DaysHistory, type DsaDailyState, type DailyAction, type DailyStatus } from "@/lib/dsa/daily";
import { dsaQuota } from "@/lib/dsa/quotas";
import { getDsaPersonalization } from "@/lib/dsa/personalization";
import { dsaDailySeed, dsaPickIndex, dsaTodayKey, istHour } from "@/lib/dsa/today";
import { StatCard } from "@/components/section-card";
import { absoluteUrl } from "@/lib/seo/site";
import { DailyPanel, type HeroQuestion } from "./_components/daily-panel";
import { StreakRibbon, StreakChip, type DayDot } from "./_components/streak";
import { LockedTeaser } from "./_components/locked-teaser";
import { InterviewCountdown } from "./_components/interview-countdown";
import type { Difficulty, Bucket } from "./_components/pills";

export const metadata: Metadata = {
  title: "DSA Lab — Your Daily Interview Question | ProdMatch.ai",
  description:
    "One fresh, role-personalized DSA interview question every day, with a progressive reveal and full Python / Java / C++ solutions — built for India's top product-company interviews.",
  alternates: { canonical: "/dsa" },
  openGraph: {
    title: "DSA Lab — Your Daily Interview Question",
    description: "A fresh personalized DSA question every day, with full Python / Java / C++ solutions.",
    url: absoluteUrl("/dsa"),
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LiveRow = {
  slug: string;
  title: string;
  framing: string;
  pattern: string;
  difficulty: Difficulty;
  bucket: Bucket;
  estimated_minutes: number;
};

function greeting(): string {
  const h = istHour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buildLast7(
  state: DsaDailyState,
  history: Map<string, { action: DailyAction; status: DailyStatus }>,
): DayDot[] {
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
  const todayKey = dsaTodayKey();
  const dots: DayDot[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    // Use the IST day key so the lookup matches what the log table stores
    // (see lib/dsa/today.ts and how upsertTodayLog writes `day`).
    const key = i === 0 ? todayKey : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
    const entry = history.get(key);
    if (i === 0) {
      const action = state.today.action;
      const solvedToday = state.today.status === "solved";
      dots.push({
        label: "Today",
        state: solvedToday
          ? "solved"
          : action === "frozen"  ? "frozen"
          : action === "skipped" ? "skipped"
          : "today",
      });
    } else if (entry) {
      const s: DayDot["state"] =
        entry.status === "solved"  ? "solved"
        : entry.action === "frozen"  ? "frozen"
        : entry.action === "skipped" ? "skipped"
        : "missed";
      dots.push({ label: fmt(d), state: s });
    } else {
      // No log entry — for a past day that means the user wasn't active.
      // Render as `missed` only if their streak says they were on the app;
      // otherwise `future` (no streak yet → no shame).
      dots.push({ label: fmt(d), state: state.streak.current > 0 ? "missed" : "future" });
    }
  }
  return dots;
}

export default async function DsaPage() {
  const admin = createSupabaseAdminClient();
  const { data } = (await admin
    .from("dsa_questions")
    .select("slug, title, framing, pattern, difficulty, bucket, estimated_minutes")
    .eq("status", "live")
    .order("slug", { ascending: true }) as never) as { data: LiveRow[] | null };

  const live = data ?? [];
  if (live.length === 0) return <TransitionPlaceholder />;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signedIn = !!user;
  const plan = user ? (await getEntitlements(user.id)).plan : "free";
  const quota = dsaQuota(plan);

  // Deterministic per-user (or global) daily pick.
  const ordered = [...live].sort((a, b) => a.slug.localeCompare(b.slug));
  const pickIdx = dsaPickIndex(dsaDailySeed(user?.id ?? null), ordered.length);
  const featured = ordered[pickIdx];
  const bonus = ordered[(pickIdx + 1) % ordered.length];

  let dailyState: DsaDailyState | null = null;
  let displayName: string | null = null;
  let history: Map<string, { action: DailyAction; status: DailyStatus }> = new Map();
  if (user) {
    await ensureTodayAssigned(user.id, featured.slug);
    [dailyState, { displayName }, history] = await Promise.all([
      getDsaDailyState(user.id, plan),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
        .then((r) => ({ displayName: (r.data?.display_name as string | null) ?? null })),
      fetchLast7DaysHistory(user.id),
    ]);
  }
  const personalization = await getDsaPersonalization(user?.id ?? null);

  const hero: HeroQuestion = {
    slug: featured.slug,
    title: featured.title,
    framing: featured.framing,
    difficulty: featured.difficulty,
    pattern: featured.pattern,
    bucket: featured.bucket,
    minutes: featured.estimated_minutes,
  };

  const companyChips = personalization.matchedCompanies.slice(0, 4).map((c) => c.name);

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-2">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">DSA Lab</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {signedIn ? `${greeting()}${displayName ? `, ${displayName}` : ""}.` : "Your daily DSA question."}
          </h1>
        </div>
        {dailyState && <StreakChip current={dailyState.streak.current} milestone={isMilestone(dailyState.streak.current)} />}
      </header>

      {/* Streak ribbon (signed in) */}
      {dailyState && (
        <StreakRibbon
          days={buildLast7(dailyState, history)}
          current={dailyState.streak.current}
          freeze={dailyState.freeze.available}
          nextAccrual={dailyState.freeze.nextAccrualInDays}
        />
      )}

      {/* Today's hero + utilities (reactive) */}
      <DailyPanel
        q={hero}
        signedIn={signedIn}
        initialStatus={dailyState?.today.status ?? "not_started"}
        initialAction={dailyState?.today.action ?? "assigned"}
        skips={dailyState?.skips ?? { used: 0, allowance: quota.skipsAllowance, period: quota.skipsPeriod }}
        freeze={{ available: dailyState?.freeze.available ?? 0 }}
        recallCadence={quota.recallCadence}
        rationale={personalization.rationale}
      />

      {/* Progress stats (signed in) */}
      {dailyState && (
        <section>
          <h2 className="mb-2.5 text-sm font-semibold tracking-tight">Your progress</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard icon={<Flame className="h-4 w-4" />} label="Current streak" value={dailyState.streak.current} tone="warning" />
            <StatCard icon={<Trophy className="h-4 w-4" />} label="Longest streak" value={dailyState.streak.longest} tone="primary" />
            <StatCard icon={<Snowflake className="h-4 w-4" />} label="Freeze tokens" value={dailyState.freeze.available} tone="success" />
            <StatCard
              icon={<CornerUpRight className="h-4 w-4" />}
              label="Skips left"
              value={quota.skipsAllowance >= 9999 ? "∞" : Math.max(0, dailyState.skips.allowance - dailyState.skips.used)}
              sub={`per ${dailyState.skips.period}`}
              tone="primary"
            />
          </div>
        </section>
      )}

      {/* Tiered surfaces */}
      <section className="space-y-2.5">
        {/* Bonus practice */}
        {quota.bonusPerDay === 0 ? (
          <LockedTeaser
            icon={<Plus className="h-4 w-4" />}
            title="Bonus practice"
            body="Go beyond today's pick — 5 extra questions a day with Pro, unlimited on Career Sprint."
            ctaLabel="Unlock with Pro"
            trigger="dsa_bonus_practice"
          />
        ) : (
          <Link
            href={`/dsa/${bonus.slug}`}
            className="press flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 focus-ring"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Plus className="h-4 w-4 text-primary" /> Bonus practice</p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{bonus.title}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {/* Company Deep Dive tracks */}
        {quota.companyTracks === "none" ? (
          <LockedTeaser
            icon={<Building2 className="h-4 w-4" />}
            title="Company Deep Dive tracks"
            body={
              companyChips.length
                ? "Curated 30-problem prep tracks for the companies your resume matches."
                : "Curated 30-problem prep tracks for India's top product companies."
            }
            ctaLabel={companyChips.length ? "Explore your tracks" : "Explore tracks"}
            trigger="dsa_company_track"
            chips={companyChips.length ? companyChips : ["Razorpay", "PhonePe", "Swiggy", "Zerodha"]}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" /> Company Deep Dive tracks</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quota.companyTracks === "full" ? "Full curated 30-problem tracks unlocked." : "Top-5 company tracks unlocked."}
            </p>
            {companyChips.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {companyChips.map((c) => (
                  <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{c}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interview Countdown — Sprint working feature */}
        {quota.interviewCountdown ? (
          <InterviewCountdown />
        ) : (
          <LockedTeaser
            icon={<Sparkles className="h-4 w-4" />}
            title="Interview Countdown"
            body="Got an interview date? Career Sprint builds a daily plan that counts down to it."
            ctaLabel="Career Sprint"
            trigger="dsa_company_track"
          />
        )}
      </section>
    </div>
  );
}

function isMilestone(n: number): boolean {
  return [3, 5, 7, 14, 30, 50, 100].includes(n);
}

// Shown only while zero questions have been approved to live.
function TransitionPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">DSA Lab · v2 in progress</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              We&apos;re rebuilding the DSA Lab from scratch.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The old templated catalog is gone. In its place we&apos;re hand-authoring 800 original questions —
              fresh framings, full Python / Java / C++ solutions, and a progressive reveal experience designed for
              India&apos;s top product interviews. Every question is reviewed manually before it goes live.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Tile icon={<Sparkles className="h-4 w-4" />} title="800 questions" body="85% pure DSA · 10% AI-applied · 5% Indian product domain. Fresh original framings only." />
        <Tile icon={<ShieldCheck className="h-4 w-4" />} title="Every question reviewed" body="Nothing reaches you until it passes manual review in the admin queue. Quality over volume." />
        <Tile icon={<Clock3 className="h-4 w-4" />} title="90-day no-repeat" body="Your daily picks won't recycle for three months once the new bank is live." />
      </section>

      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll email you the moment the first batch goes live. No filler — only fully reviewed questions.
      </p>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
