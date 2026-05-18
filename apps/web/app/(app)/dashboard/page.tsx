import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Briefcase, Target, TrendingUp, Building2,
  ChevronRight, CheckCircle2,
  Sparkles, BarChart3, Compass, Clock, AlertCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { Tooltip } from "@/components/tooltip";
import { DnaBreakdownInline } from "@/components/dna-breakdown-panel";
import type { DnaBreakdown } from "@/lib/matching/dna-breakdown";
import { computeMarketSignals, type MarketJobLite } from "@/lib/insights/market-intel";
import { getUserConsents } from "@/lib/dpdp/consent";

// Sprint 6 dashboard surfaces — colocated under app/(app)/dashboard.
import { MatchBandCard, type MatchBandCounts } from "./match-band-card";
import { IncompletenessBanner, detectIncompleteness } from "./incompleteness-banner";
import { NextActionCard, pickNextAction } from "./next-action-card";
import { ResumeGuidanceCard } from "./resume-guidance-card";
import { CatalogPulse } from "./catalog-pulse";
import { SkillCoverageCard, aggregateSkillCoverage } from "./skill-coverage-card";
import { RecommendedCompaniesCard, rankCompaniesForUser } from "./recommended-companies";
import { ToolDiscoveryCard } from "./tool-discovery-card";
import { TopMatchesMobile, type TopMatchCard } from "./top-matches-mobile";
import { ContinueCard } from "./continue-card";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_COLORS: Record<string, string> = {
  saved:        "bg-primary-soft text-primary-soft-foreground border-primary/20",
  applied:      "bg-primary-soft text-primary-soft-foreground border-primary/20",
  interviewing: "bg-warning/10 text-warning border-warning/20",
  offer:        "bg-success/10 text-success border-success/20",
  rejected:     "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn:    "bg-muted text-muted-foreground border-border",
};

const STATUS_BAR: Record<string, string> = {
  saved:        "bg-primary/60",
  applied:      "bg-primary",
  interviewing: "bg-warning",
  offer:        "bg-success",
  rejected:     "bg-destructive",
  withdrawn:    "bg-muted-foreground/40",
};

const STUCK_DAYS = 7;

type RecentMatch = {
  score: number;
  verdict: string | null;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
};

type ConfidenceRow = {
  score: number;
  verdict: string | null;
  confidence: number | null;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
};

type TechCoverageRow = { score: number; tech_coverage: unknown };

type StuckApp = {
  id: string;
  applied_at: string;
  status: string;
  jobs: { title: string; companies: { name: string; logo_url: string | null } | null } | null;
};

type RecentApp = {
  id: string;
  status: string;
  applied_at: string | null;
  job_id: string;
  jobs: {
    title: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const since7d  = new Date(Date.now() - 7  * 24 * 3_600_000).toISOString();
  const since14d = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();
  const stuckSince = new Date(Date.now() - STUCK_DAYS * 24 * 3_600_000).toISOString();

  const [
    { data: profile },
    { count: matchCount },
    { count: appCount },
    bandResults,
    { data: appsByStatus },
    { data: recentAppsRaw },
    { data: stuckAppsRaw },
    { data: topRankedRaw },
    { data: techCoverageRaw },
    { data: companyMatchRaw },
    { count: activeJobCount },
    { data: marketJobsRaw },
    { data: latestCrawl },
    consents,
    { count: tailoredCount },
    { count: memoCount },
  ] = await Promise.all([
    supabase.from("profiles")
      .select("display_name, resume_storage_path, product_dna_score, dna_breakdown, years_experience, current_role, resume_score, resume_score_breakdown, tech_stack, preferred_hubs, resume_embedding_at, last_match_compute_at, resume_signature, resume_parsed")
      .eq("id", user.id).maybeSingle(),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    // Five separate count queries — bands. Cheap (head only), parallelised.
    Promise.all([
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("score", 90),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("score", 75).lt("score", 90),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("score", 60).lt("score", 75),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("score", 40).lt("score", 60),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id).lt("score", 40),
    ]),
    supabase.from("applications").select("status").eq("user_id", user.id),
    supabase.from("applications")
      .select("id, status, applied_at, job_id, jobs(title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    // Stuck applications — applied >7d ago, still in 'applied' status.
    supabase.from("applications")
      .select("id, status, applied_at, jobs(title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .eq("status", "applied")
      .lt("applied_at", stuckSince)
      .order("applied_at", { ascending: true })
      .limit(5),
    // Top-ranked matches for hero/carousel + next-action picks.
    supabase.from("matches")
      .select("score, verdict, confidence, job_id, seen_at, user_hidden, jobs(id, title, companies(name, slug, logo_url))")
      .eq("user_id", user.id)
      .eq("user_hidden", false)
      .order("score", { ascending: false })
      .limit(20),
    // Tech-coverage rollup — top-50 unhidden matches with non-null coverage.
    supabase.from("matches")
      .select("score, tech_coverage")
      .eq("user_id", user.id)
      .eq("user_hidden", false)
      .not("tech_coverage", "is", null)
      .order("score", { ascending: false })
      .limit(50),
    // Company recommendations — top 100 non-hidden matches.
    supabase.from("matches")
      .select("score, job_id, jobs(id, companies(name, slug, logo_url))")
      .eq("user_id", user.id)
      .eq("user_hidden", false)
      .order("score", { ascending: false })
      .limit(100),
    supabase.from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("jobs")
      .select("title, tech_stack, role_function, created_at")
      .eq("is_active", true)
      .limit(5000),
    // Most-recent crawl_runs row.
    supabase.from("crawl_runs")
      .select("finished_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getUserConsents(user.id),
    supabase.from("tailored_resumes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("negotiation_memos").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const marketJobs = (marketJobsRaw as MarketJobLite[] | null) ?? [];

  const hasResume = !!profile?.resume_storage_path;
  const dnaScore = profile?.product_dna_score ?? null;
  const dnaBreakdown = ((profile as { dna_breakdown?: DnaBreakdown | null } | null)?.dna_breakdown) ?? null;
  const resumeScore = (profile as { resume_score?: number | null } | null)?.resume_score ?? null;
  const resumeBreakdown = (profile as { resume_score_breakdown?: unknown } | null)?.resume_score_breakdown ?? null;
  const displayName = profile?.display_name ?? null;
  const techStack = ((profile as { tech_stack?: unknown } | null)?.tech_stack as string[] | null) ?? [];
  const preferredHubs = ((profile as { preferred_hubs?: string[] | null } | null)?.preferred_hubs) ?? [];
  const resumeParsed = (profile as { resume_parsed?: { current_role?: string | null } | null } | null)?.resume_parsed ?? null;
  const matchingConsentGranted = consents.matching === true;
  const careerHealth = dnaScore !== null && resumeScore !== null
    ? Math.round((dnaScore * 0.55 + resumeScore * 0.45))
    : null;
  const { signals: marketSignals, roleLabel: marketRoleLabel } = computeMarketSignals(
    marketJobs, since7d, since14d, techStack, 4,
  );

  const bandCounts: MatchBandCounts = {
    excellent: bandResults[0].count ?? 0,
    strong:    bandResults[1].count ?? 0,
    plausible: bandResults[2].count ?? 0,
    weak:      bandResults[3].count ?? 0,
    reject:    bandResults[4].count ?? 0,
    total:     matchCount ?? 0,
  };

  const topRanked = ((topRankedRaw as unknown as Array<ConfidenceRow & { seen_at: string | null; user_hidden: boolean }> | null) ?? []);
  const recentMatches = topRanked.slice(0, 6) as RecentMatch[];
  const unseenStrong = topRanked.find((r) => r.verdict === "strong_fit" && r.seen_at === null);
  const topMatch = topRanked[0] ?? null;

  const recentApps = (recentAppsRaw as unknown as RecentApp[] | null) ?? [];
  const stuckApps = (stuckAppsRaw as unknown as StuckApp[] | null) ?? [];

  const skillCoverage = aggregateSkillCoverage({
    rows: ((techCoverageRaw as TechCoverageRow[] | null) ?? []),
  });

  const recommendedCompanies = rankCompaniesForUser(
    (companyMatchRaw as Array<{ score: number; job_id: string; jobs: { id: string; companies: { name: string; slug: string; logo_url: string | null } | null } | null }> | null) ?? [],
    5,
  );

  const pipeline = (appsByStatus ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  // Stale matches: resume changed AFTER last compute → recompute needed.
  const resumeAtMs = profile?.resume_embedding_at ? new Date(profile.resume_embedding_at).getTime() : 0;
  const lastComputeMs = profile?.last_match_compute_at ? new Date(profile.last_match_compute_at).getTime() : 0;
  const matchesStale = hasResume && resumeAtMs > lastComputeMs && lastComputeMs > 0;

  // Weakest resume dim (under 50% of weight, weight >= 10) for NextActionCard.
  let weakestResumeDim: { label: string; hint: string } | null = null;
  if (Array.isArray(resumeBreakdown)) {
    interface DimRow { label?: string; hint?: string; score?: number; weight?: number }
    const ranked = (resumeBreakdown as DimRow[])
      .filter((d): d is Required<DimRow> => typeof d.label === "string" && typeof d.hint === "string" && typeof d.score === "number" && typeof d.weight === "number" && d.weight >= 10)
      .map((d) => ({ ...d, pct: d.score / d.weight }))
      .sort((a, b) => a.pct - b.pct);
    if (ranked.length > 0 && ranked[0].pct < 0.5) {
      weakestResumeDim = { label: ranked[0].label, hint: ranked[0].hint };
    }
  }

  const nextAction = pickNextAction({
    hasResume,
    matchingConsentGranted,
    matchesStale,
    stuckApps: stuckApps.map((a) => ({
      id: a.id,
      job_title: a.jobs?.title ?? "Application",
      days: Math.max(0, Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000)),
    })),
    unseenStrongFit: unseenStrong?.jobs ? {
      jobId: unseenStrong.jobs.id,
      title: unseenStrong.jobs.title,
      company: unseenStrong.jobs.companies?.name ?? "—",
    } : null,
    topMatch: topMatch?.jobs ? {
      jobId: topMatch.jobs.id,
      title: topMatch.jobs.title,
      company: topMatch.jobs.companies?.name ?? "—",
      score: topMatch.score,
    } : null,
    coachOrToolUsed: (tailoredCount ?? 0) + (memoCount ?? 0) > 0,
    preferredHubsCount: preferredHubs.length,
    weakestResumeDim,
  });

  const incompleteness = detectIncompleteness({
    preferredHubsCount: preferredHubs.length,
    hasResume,
    matchingConsentGranted,
    techStackCount: techStack.length,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Sprint 6 — Personalized greeting: use parsed current_role when displayName
  // is missing (this user's case). Falls back gracefully.
  const greetingSubject = displayName
    ? displayName.split(" ")[0]
    : resumeParsed?.current_role
      ? resumeParsed.current_role
      : "there";

  const subline = profile?.current_role
    ? `${profile.current_role}${profile.years_experience ? ` · ${profile.years_experience} yrs exp` : ""}`
    : "Your career intelligence command center.";

  const topMatchesForMobile: TopMatchCard[] = recentMatches.map((m) => {
    const c = topRanked.find((t) => t.job_id === m.job_id);
    return {
      jobId: m.job_id,
      title: m.jobs?.title ?? "Role",
      company: m.jobs?.companies?.name ?? "—",
      logoUrl: m.jobs?.companies?.logo_url ?? null,
      score: m.score,
      verdict: m.verdict,
      confidence: c?.confidence ?? null,
    };
  });

  const setupSteps = [
    { done: hasResume,                   label: "Upload your resume",      href: "/profile",   desc: "We parse it and compute your readiness signal" },
    { done: matchingConsentGranted,      label: "Grant matching consent",   href: "/settings/privacy", desc: "DPDP Act 2023 — required to run AI matching" },
    { done: (matchCount ?? 0) > 0,       label: "Compute your matches",    href: "/matches",   desc: "AI ranks every active role for you" },
    { done: (appCount ?? 0) > 0,         label: "Track an application",    href: "/applications", desc: "Stay on top of your pipeline" },
  ];
  const allSetupDone = setupSteps.every((s) => s.done);

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        {/* Responsive reflow: name+role full-width on mobile, DNA below.
            On `sm+`, flex-row with DNA right-aligned. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{greetingSubject}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subline}</p>
          </div>

          {dnaScore !== null && (
            <Tooltip
              label={
                dnaBreakdown ? (
                  <div className="space-y-2 text-left">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Readiness sums to <span className="font-bold text-foreground">{dnaBreakdown.total}/100</span>
                    </p>
                    <DnaBreakdownInline breakdown={dnaBreakdown} />
                    <Link href="/profile#dna-breakdown" className="block text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline">
                      See full breakdown →
                    </Link>
                  </div>
                ) : (
                  "Product-Co Readiness (0–100) — a coaching signal of how recruiter screens at top product companies are likely to read your profile. It does not affect your match scores."
                )
              }
            >
              <Link href="/profile#dna-breakdown" className="flex shrink-0 cursor-pointer items-center gap-3 sm:flex-col sm:items-center sm:gap-1.5">
                <ScoreRing score={dnaScore} size="lg" showLabel={false} />
                <span className="text-xs font-medium text-muted-foreground">Readiness</span>
              </Link>
            </Tooltip>
          )}
        </div>

        {/* Catalog pulse + career health */}
        {((activeJobCount ?? 0) > 0 || careerHealth !== null) && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {(activeJobCount ?? 0) > 0 && (
              <CatalogPulse
                lastFinishedAt={latestCrawl?.finished_at ?? null}
                activeJobCount={activeJobCount ?? 0}
              />
            )}
            {careerHealth !== null && (
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">Career health</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      careerHealth >= 75 ? "bg-success" :
                      careerHealth >= 55 ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${careerHealth}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold tabular-nums ${
                  careerHealth >= 75 ? "text-success" :
                  careerHealth >= 55 ? "text-warning" : "text-primary"
                }`}>{careerHealth}/100</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Continue where you left off (Sprint 6 session history) ─ */}
      <ContinueCard />

      {/* ── Profile incompleteness banner (PR 1.2) ──────────────── */}
      {incompleteness.length > 0 && <IncompletenessBanner issues={incompleteness} />}

      {/* ── Next best action (PR 3.1) ───────────────────────────── */}
      {nextAction && <NextActionCard action={nextAction} />}

      {/* ── Stats grid — Matches card now shows band stack ──────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Readiness"
          value={dnaScore !== null ? String(dnaScore) : "—"}
          sub={dnaScore !== null ? dnaScoreLabel(dnaScore) : "Upload resume"}
          href="/profile"
          badge={dnaScore !== null ? `/ 100` : undefined}
        />
        <MatchBandCard counts={bandCounts} />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Applications"
          value={String(appCount ?? 0)}
          sub="in pipeline"
          href="/applications"
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Companies"
          value="18"
          sub="product cos tracked"
          href="/matches"
        />
      </div>

      {/* ── Resume guidance card (PR 1.4) ───────────────────────── */}
      {resumeScore !== null && (
        <ResumeGuidanceCard resumeScore={resumeScore} breakdown={resumeBreakdown} />
      )}

      {/* ── Skill coverage (PR 2.1) ─────────────────────────────── */}
      <SkillCoverageCard data={skillCoverage} />

      {/* ── Mobile top-matches carousel (PR 3.6) ────────────────── */}
      <TopMatchesMobile matches={topMatchesForMobile} />

      {/* ── Main content grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Application pipeline OR Stuck apps OR Get-started ladder */}
        {stuckApps.length > 0 ? (
          <SectionCard
            title="Stuck applications"
            subtitle={`Applied >${STUCK_DAYS} days ago, no status change`}
            actionHref="/applications"
            actionLabel="View all"
          >
            <ul className="space-y-2">
              {stuckApps.slice(0, 4).map((a) => {
                const days = Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000);
                return (
                  <li key={a.id}>
                    <Link
                      href={`/applications/${a.id}`}
                      className="group flex items-center gap-3 rounded-md px-2 py-2 -mx-2 transition hover:bg-secondary/40 focus-ring"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.jobs?.title ?? "Application"}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.jobs?.companies?.name ?? "—"} · {days}d ago</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ) : (appCount ?? 0) > 0 ? (
          <SectionCard
            title="Application pipeline"
            subtitle={`${appCount} total tracked`}
            actionHref="/applications"
            actionLabel="View all"
          >
            <div className="space-y-3">
              {Object.entries(pipeline).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 rounded-full border px-2 py-0.5 text-center text-[11px] font-medium capitalize ${STATUS_COLORS[status] ?? "bg-secondary text-foreground border-border"}`}>
                    {status}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${STATUS_BAR[status] ?? "bg-primary"}`}
                      style={{ width: `${Math.min((count / (appCount ?? 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          !allSetupDone && (
            <SectionCard
              title="Get started"
              subtitle="Complete these steps to get your first matches"
            >
              <ol className="space-y-4">
                {setupSteps.map(({ done, label, href, desc }, i) => {
                  const isCurrent = !done && setupSteps.slice(0, i).every((s) => s.done);
                  return (
                    <li key={label} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-primary-soft text-primary-soft-foreground ring-1 ring-primary/30"
                            : "bg-secondary text-muted-foreground ring-1 ring-border"
                      }`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> : <span>{i + 1}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        {done ? (
                          <p className="text-sm text-muted-foreground line-through">{label}</p>
                        ) : (
                          <Link href={href} className="group inline-flex items-center gap-1 text-sm font-medium transition hover:text-primary focus-ring rounded">
                            {label}
                            <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                          </Link>
                        )}
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </SectionCard>
          )
        )}

        {/* Top matches — desktop list (mobile uses the carousel above) */}
        {recentMatches.length > 0 && (
          <div className="hidden lg:block">
            <SectionCard
              title="Top matches"
              subtitle="Ranked by AI fit score"
              actionHref="/matches"
              actionLabel="View all"
            >
              <div className="space-y-1.5">
                {recentMatches.map((m) => {
                  const job = m.jobs;
                  const company = job?.companies;
                  const verdictTone =
                    m.verdict === "strong_fit"    ? "text-success" :
                    m.verdict === "stretch"       ? "text-warning" :
                    "text-muted-foreground";
                  const verdictLabel =
                    m.verdict === "strong_fit"    ? "Strong" :
                    m.verdict === "stretch"       ? "Stretch" :
                    m.verdict === "off_target"    ? "Off-target" :
                    m.verdict === "underqualified" ? "Under" : "—";
                  return (
                    <Link
                      key={m.job_id}
                      href={`/jobs/${m.job_id}`}
                      className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition hover:bg-secondary focus-ring"
                    >
                      <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium transition group-hover:text-primary">{job?.title ?? "Role"}</p>
                        <p className="truncate text-xs text-muted-foreground">{company?.name ?? "—"}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums">{Math.round(m.score)}</span>
                        <span className={`text-[10px] font-medium ${verdictTone}`}>{verdictLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Recommended companies (PR 3.3) */}
        {recommendedCompanies.length > 0 && <RecommendedCompaniesCard companies={recommendedCompanies} />}

        {/* Recent activity */}
        {recentApps.length > 0 && (
          <SectionCard
            title="Recent activity"
            subtitle="Your application history"
            actionHref="/applications"
            actionLabel="View all"
          >
            <div className="space-y-1.5">
              {recentApps.map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition hover:bg-secondary focus-ring"
                >
                  <CompanyLogo name={a.jobs?.companies?.name ?? "?"} logoUrl={a.jobs?.companies?.logo_url ?? null} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.jobs?.title ?? "Application"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.jobs?.companies?.name ?? ""}{a.applied_at ? ` · ${formatDate(a.applied_at)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_COLORS[a.status] ?? ""}`}>
                    {a.status}
                  </span>
                </Link>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Tools you haven't tried (PR 3.4) */}
        <ToolDiscoveryCard
          inputs={{
            topJobId: topMatch?.jobs?.id ?? null,
            topJobTitle: topMatch?.jobs?.title ?? null,
            tailoredCount: tailoredCount ?? 0,
            memoCount: memoCount ?? 0,
          }}
        />

        {/* Market intelligence (kept as-is) */}
        <SectionCard
          title="Market intelligence"
          subtitle={marketRoleLabel ?? "India product-company trends"}
          actionHref="/insights"
          actionLabel="Explore"
          footer="Demand = active roles per family · Trend = this week vs prior week · Source: 18 official career pages"
        >
          <div className="space-y-3">
            {marketSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Catalog is still warming up — check back after the next crawl.
              </p>
            ) : marketSignals.map(({ key, label, demand, trend, thisWeek }) => {
              const trendTone =
                trend === null              ? "text-muted-foreground/60"
                : trend.startsWith("+")     ? "text-success"
                : "text-destructive";
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={`${thisWeek} new in last 7d`}>{label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-1.5 rounded-full bg-primary transition-all duration-700" style={{ width: `${demand}%` }} />
                  </div>
                  <span className={`w-14 shrink-0 text-right text-[11px] font-medium tabular-nums ${trendTone}`}>
                    {trend ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ── Quick links ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/matches",      icon: <Briefcase className="h-4 w-4" />,   label: "Browse matches" },
          { href: "/coach",        icon: <Compass className="h-4 w-4" />,     label: "AI Coach" },
          { href: "/insights",     icon: <BarChart3 className="h-4 w-4" />,   label: "Market insights" },
          { href: "/applications", icon: <Clock className="h-4 w-4" />,       label: "Applications" },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-foreground focus-ring tap-target-sm"
          >
            <span className="shrink-0 text-primary transition group-hover:text-primary-soft-foreground">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard — unified panel chrome used across the dashboard grid.
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, actionHref, actionLabel, footer, children,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary focus-ring rounded"
          >
            {actionLabel} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      {children}
      {footer && (
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
          {footer}
        </p>
      )}
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type BadgeTone = "primary" | "success" | "warning";

const BADGE_TONE: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

function StatCard({
  icon, label, value, sub, href, badge, badgeTone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  href: string;
  badge?: string;
  badgeTone?: BadgeTone;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring sm:p-5"
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {badge && (
          <span className={`mb-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BADGE_TONE[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

function dnaScoreLabel(score: number): string {
  if (score >= 80) return "Application-ready";
  if (score >= 60) return "Strong — minor lifts available";
  if (score >= 40) return "Solid foundation";
  return "Early — clear levers to grow";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}
