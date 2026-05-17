import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Briefcase, Target, TrendingUp, Building2,
  ChevronRight, CheckCircle2, Circle, ArrowUpRight,
  Sparkles, Zap, BarChart3, Activity, Clock,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { Tooltip } from "@/components/tooltip";
import { DnaBreakdownInline } from "@/components/dna-breakdown-panel";
import type { DnaBreakdown } from "@/lib/matching/dna-breakdown";
import { computeMarketSignals, type MarketJobLite } from "@/lib/insights/market-intel";

export const metadata: Metadata = { title: "Dashboard" };

// Application-status palette — semantic tokens only. Maps the 6 pipeline
// stages onto three meaningful tones: primary (in progress), success
// (positive outcome), destructive (negative outcome), muted (parked).
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

type RecentMatch = {
  score: number;
  verdict: string | null;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
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

  const [
    { data: profile },
    { count: matchCount },
    { count: appCount },
    { data: recentMatchesRaw },
    { data: appsByStatus },
    { data: recentAppsRaw },
    { count: newStrongCount },
    { count: activeJobCount },
    { data: recentJobsRaw },
    { data: marketJobsRaw },
  ] = await Promise.all([
    supabase.from("profiles")
      .select("display_name, resume_storage_path, product_dna_score, dna_breakdown, years_experience, current_role, resume_score, tech_stack")
      .eq("id", user.id).maybeSingle(),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("matches")
      .select("score, verdict, job_id, jobs(id, title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(6),
    supabase.from("applications")
      .select("status")
      .eq("user_id", user.id),
    supabase.from("applications")
      .select("id, status, applied_at, job_id, jobs(title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("matches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("verdict", "strong_fit")
      .is("seen_at", null),
    supabase.from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("jobs")
      .select("company_id, companies(name, slug, logo_url)")
      .eq("is_active", true)
      .gte("created_at", since7d)
      .limit(300),
    // Market intelligence aggregation — full active catalog (title +
    // role_function + tech_stack + created_at). Used to compute real
    // role-family demand and week-over-week trend on the dashboard.
    supabase
      .from("jobs")
      .select("title, tech_stack, role_function, created_at")
      .eq("is_active", true)
      .limit(5000),
  ]);
  const marketJobs = (marketJobsRaw as MarketJobLite[] | null) ?? [];

  const recentMatches = (recentMatchesRaw as unknown as RecentMatch[] | null) ?? [];
  const recentApps = (recentAppsRaw as unknown as RecentApp[] | null) ?? [];

  const hasResume = !!profile?.resume_storage_path;
  const dnaScore = profile?.product_dna_score ?? null;
  const dnaBreakdown = ((profile as { dna_breakdown?: DnaBreakdown | null } | null)?.dna_breakdown) ?? null;
  const resumeScore = (profile as { resume_score?: number | null } | null)?.resume_score ?? null;
  const displayName = profile?.display_name ?? null;
  const techStack = ((profile as { tech_stack?: unknown } | null)?.tech_stack as string[] | null) ?? [];
  const careerHealth = dnaScore !== null && resumeScore !== null
    ? Math.round((dnaScore * 0.55 + resumeScore * 0.45))
    : null;
  const { signals: marketSignals, roleLabel: marketRoleLabel } = computeMarketSignals(
    marketJobs, since7d, since14d, techStack, 4,
  );

  type CompanyActivity = { name: string; slug: string; logo_url: string | null; count: number };
  const activityMap = new Map<string, CompanyActivity>();
  for (const job of (recentJobsRaw as Array<{ company_id: string; companies: { name: string; slug: string; logo_url: string | null } | null }> | null) ?? []) {
    const co = job.companies;
    if (!co?.slug) continue;
    const e = activityMap.get(co.slug);
    if (e) { e.count++; } else { activityMap.set(co.slug, { name: co.name, slug: co.slug, logo_url: co.logo_url, count: 1 }); }
  }
  const topActiveCompanies = [...activityMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const pipeline = (appsByStatus ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const steps = [
    { done: hasResume, label: "Upload your resume", href: "/profile", desc: "We parse and compute your DNA score" },
    { done: (matchCount ?? 0) > 0, label: "Compute your matches", href: "/matches", desc: "AI ranks every active role for you" },
    { done: (appCount ?? 0) > 0, label: "Track an application", href: "/applications", desc: "Stay on top of your pipeline" },
  ];
  const allDone = steps.every((s) => s.done);
  const currentStep = steps.findIndex((s) => !s.done);

  // Strong fit count for progress indicator
  const strongFitCount = recentMatches.filter((m) => m.verdict === "strong_fit").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero greeting ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
              {displayName ? displayName.split(" ")[0] : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {profile?.current_role
                ? `${profile.current_role}${profile.years_experience ? ` · ${profile.years_experience} yrs exp` : ""}`
                : "Your career intelligence command center."}
            </p>
          </div>

          {dnaScore !== null && (
            <Tooltip
              label={
                dnaBreakdown ? (
                  <div className="space-y-2 text-left">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Product DNA — sums to <span className="font-bold text-foreground">{dnaBreakdown.total}/100</span>
                    </p>
                    <DnaBreakdownInline breakdown={dnaBreakdown} />
                    <Link href="/profile#dna-breakdown" className="block text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline">
                      See full breakdown →
                    </Link>
                  </div>
                ) : (
                  "Product DNA score (0–100): how strongly your background fits high-package product-company hiring."
                )
              }
            >
              <Link href="/profile#dna-breakdown" className="flex cursor-pointer flex-col items-center gap-1.5">
                <ScoreRing score={dnaScore} size="lg" showLabel={false} />
                <span className="text-xs font-medium text-muted-foreground">Product DNA</span>
              </Link>
            </Tooltip>
          )}
        </div>

        {/* Inline market signal + career health */}
        {((activeJobCount ?? 0) > 0 || careerHealth !== null) && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {(activeJobCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-success" />
                <span>
                  <strong className="text-foreground tabular-nums">{(activeJobCount ?? 0).toLocaleString("en-IN")}</strong> active roles
                  across 18 product companies
                  {(newStrongCount ?? 0) > 0 && (
                    <> · <Link href="/matches?show=new" className="font-medium text-success hover:underline">
                      {newStrongCount} new strong {(newStrongCount ?? 0) === 1 ? "fit" : "fits"} for you
                    </Link></>
                  )}
                </span>
              </div>
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

      {/* ── New strong-fit banner ─────────────────────────────────── */}
      {hasResume && (newStrongCount ?? 0) > 0 && (
        <Link
          href="/matches?show=new"
          className="group flex items-center justify-between gap-4 rounded-xl border border-success/30 bg-success/5 px-5 py-4 transition hover:border-success/50 hover:bg-success/10 focus-ring"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success text-success-foreground">
              <Zap className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-success">
                {newStrongCount} new strong {(newStrongCount ?? 0) === 1 ? "fit" : "fits"} since your last visit
              </p>
              <p className="text-xs text-muted-foreground">From this morning&apos;s crawl · 18 target companies</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-success transition group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* ── Resume prompt ─────────────────────────────────────────── */}
      {!hasResume && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Start with your resume</h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Upload your PDF — we&apos;ll compute your Product DNA score and rank every active role
                across 18 product companies with AI-generated Fit Cards.
              </p>
              <Link
                href="/profile"
                className="press mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
              >
                Upload resume <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Product DNA"
          value={dnaScore !== null ? String(dnaScore) : "—"}
          sub={dnaScore !== null ? dnaScoreLabel(dnaScore) : "Upload resume"}
          href="/profile"
          badge={dnaScore !== null ? `/ 100` : undefined}
        />
        <StatCard
          icon={<Briefcase className="h-4 w-4" />}
          label="Matches"
          value={String(matchCount ?? 0)}
          sub={strongFitCount > 0 ? `${strongFitCount} strong fit` : "compute matches"}
          href="/matches"
          badge={strongFitCount > 0 ? `${strongFitCount} strong` : undefined}
          badgeTone="success"
        />
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

      {/* ── Resume strength indicator ─────────────────────────────── */}
      {resumeScore !== null && (
        <Link
          href="/profile#resume-score"
          className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-2 w-32 sm:w-40 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  resumeScore >= 80 ? "bg-success"
                  : resumeScore >= 60 ? "bg-warning"
                  : "bg-destructive"
                }`}
                style={{ width: `${resumeScore}%` }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                Resume strength · <span className={`font-semibold tabular-nums ${
                  resumeScore >= 80 ? "text-success"
                  : resumeScore >= 60 ? "text-warning"
                  : "text-destructive"
                }`}>{resumeScore}/100</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {resumeScore >= 85 ? "Application-ready for top product companies" :
                 resumeScore >= 70 ? "Strong baseline — minor tweaks recommended" :
                 resumeScore >= 55 ? "Solid — address gaps to improve match quality" :
                 "Needs work — review tips on your profile"}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
        </Link>
      )}

      {/* ── Main content grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Application pipeline */}
        {(appCount ?? 0) > 0 ? (
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
          !allDone && (
            <SectionCard
              title="Get started"
              subtitle="Complete these steps to get your first matches"
            >
              <ol className="space-y-4">
                {steps.map(({ done, label, href, desc }, i) => (
                  <li key={label} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : i === currentStep
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
                ))}
              </ol>
            </SectionCard>
          )
        )}

        {/* Top matches */}
        {recentMatches.length > 0 && (
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
        )}

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

        {/* Hiring this week — real job data */}
        {topActiveCompanies.length > 0 && (
          <SectionCard
            title="Hiring this week"
            subtitle="New roles · live data"
            actionHref="/insights"
            actionLabel="Full report"
            footer="Official career pages only · refreshed daily via crawler"
          >
            <div className="space-y-2.5">
              {topActiveCompanies.map(({ name, slug, logo_url, count }) => (
                <div key={slug} className="flex items-center gap-3">
                  <CompanyLogo name={name} logoUrl={logo_url} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{name}</span>
                  <div className="w-24 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${(count / (topActiveCompanies[0]?.count ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">+{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Market intelligence — personalized */}
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

        {/* All done */}
        {allDone && (appCount ?? 0) === 0 && (
          <div className="flex items-start gap-4 rounded-xl border border-success/30 bg-success/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success text-success-foreground">
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-semibold">You&apos;re set up!</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Start tracking your applications to unlock pipeline analytics.
              </p>
              <Link
                href="/applications"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-success hover:underline focus-ring rounded"
              >
                Track an application <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick links row — restrained monochrome ──────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/matches",      icon: <Briefcase className="h-4 w-4" />,   label: "Browse matches" },
          { href: "/coach",        icon: <Sparkles className="h-4 w-4" />,    label: "AI Coach" },
          { href: "/insights",     icon: <BarChart3 className="h-4 w-4" />,   label: "Market insights" },
          { href: "/applications", icon: <Clock className="h-4 w-4" />,       label: "Applications" },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-foreground focus-ring"
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
  if (score >= 80) return "Strong product fit";
  if (score >= 60) return "Good product exp";
  if (score >= 40) return "Mixed background";
  return "Building product exp";
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

// (Sprint 1 — Item 1) The hardcoded personalizedMarketSignals() function that
// previously lived here has been removed. Market signals are now computed
// from the live jobs table via computeMarketSignals() in
// @/lib/insights/market-intel — real demand counts and real week-over-week
// trend. See Promise.all above for the data fetch.
