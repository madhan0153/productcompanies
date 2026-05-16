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

const STATUS_COLORS: Record<string, string> = {
  saved:        "bg-sky-400/10 text-sky-400 border-sky-400/20",
  applied:      "bg-violet-400/10 text-violet-400 border-violet-400/20",
  interviewing: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  offer:        "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rejected:     "bg-rose-400/10 text-rose-400 border-rose-400/20",
  withdrawn:    "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const STATUS_BAR: Record<string, string> = {
  saved:        "bg-sky-400",
  applied:      "bg-violet-400",
  interviewing: "bg-amber-400",
  offer:        "bg-emerald-400",
  rejected:     "bg-rose-400",
  withdrawn:    "bg-zinc-400",
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/80 via-card/40 to-transparent p-6">
        <div aria-hidden className="absolute right-0 top-0 h-48 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
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
          <div className="relative mt-4 space-y-3 border-t border-border/40 pt-4">
            {(activeJobCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  <strong className="text-foreground">{(activeJobCount ?? 0).toLocaleString("en-IN")}</strong> active roles
                  across 18 product companies
                  {(newStrongCount ?? 0) > 0 && (
                    <> · <Link href="/matches?show=new" className="text-emerald-400 hover:underline">
                      {newStrongCount} new strong {(newStrongCount ?? 0) === 1 ? "fit" : "fits"} for you
                    </Link></>
                  )}
                </span>
              </div>
            )}
            {careerHealth !== null && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70 w-24 shrink-0">Career health</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      careerHealth >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                      careerHealth >= 55 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                      "bg-gradient-to-r from-sky-400 to-sky-500"
                    }`}
                    style={{ width: `${careerHealth}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold tabular-nums ${
                  careerHealth >= 75 ? "text-emerald-400" :
                  careerHealth >= 55 ? "text-amber-400" : "text-sky-400"
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
          className="group flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent px-5 py-4 transition hover:border-emerald-400/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                {newStrongCount} new strong {(newStrongCount ?? 0) === 1 ? "fit" : "fits"} since your last visit
              </p>
              <p className="text-xs text-muted-foreground">From this morning&apos;s crawl · 18 target companies</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-emerald-400 transition group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* ── Resume prompt ─────────────────────────────────────────── */}
      {!hasResume && (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary-soft p-6">
          <div className="relative flex flex-wrap items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Start with your resume</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Upload your PDF — we&apos;ll compute your Product DNA score and rank every active role
                across 18 product companies with AI-generated Fit Cards.
              </p>
              <Link
                href="/profile"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
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
          icon={<Target className="h-4.5 w-4.5" />}
          label="Product DNA"
          value={dnaScore !== null ? String(dnaScore) : "—"}
          sub={dnaScore !== null ? dnaScoreLabel(dnaScore) : "Upload resume"}
          href="/profile"
          color="primary"
          badge={dnaScore !== null ? `/ 100` : undefined}
        />
        <StatCard
          icon={<Briefcase className="h-4.5 w-4.5" />}
          label="Matches"
          value={String(matchCount ?? 0)}
          sub={`${strongFitCount} strong fit`}
          href="/matches"
          color="violet"
          badge={strongFitCount > 0 ? `${strongFitCount} strong` : undefined}
          badgeColor="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          label="Applications"
          value={String(appCount ?? 0)}
          sub="in pipeline"
          href="/applications"
          color="emerald"
        />
        <StatCard
          icon={<Building2 className="h-4.5 w-4.5" />}
          label="Companies"
          value="18"
          sub="product cos tracked"
          href="/matches"
          color="amber"
        />
      </div>

      {/* ── Resume strength indicator ─────────────────────────────── */}
      {resumeScore !== null && (
        <Link
          href="/profile#resume-score"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/40 px-5 py-4 transition hover:border-primary/30 hover:bg-card/60"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-2 w-36 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${resumeScore >= 80 ? "bg-emerald-400" : resumeScore >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: `${resumeScore}%` }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                Resume strength · <span className={`font-bold ${resumeScore >= 80 ? "text-emerald-400" : resumeScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>{resumeScore}/100</span>
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
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Application pipeline</h2>
                <p className="text-xs text-muted-foreground">{appCount} total tracked</p>
              </div>
              <Link href="/applications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {Object.entries(pipeline).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 rounded-full border px-2 py-0.5 text-center text-[11px] font-medium capitalize ${STATUS_COLORS[status] ?? "bg-secondary text-foreground border-border"}`}>
                    {status}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary/60">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${STATUS_BAR[status] ?? "bg-primary"}`}
                      style={{ width: `${Math.min((count / (appCount ?? 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Getting started */
          !allDone && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Get started</h2>
                <p className="text-xs text-muted-foreground">Complete these steps to get your first matches</p>
              </div>
              <ol className="space-y-4">
                {steps.map(({ done, label, href, desc }, i) => (
                  <li key={label} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${
                      done
                        ? "bg-primary ring-primary/30 text-primary-foreground"
                        : i === currentStep
                          ? "bg-primary/15 ring-primary/40 text-primary"
                          : "bg-secondary ring-border text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      {done ? (
                        <p className="text-sm text-muted-foreground line-through">{label}</p>
                      ) : (
                        <Link href={href} className="group flex items-center gap-1 text-sm font-medium hover:text-primary transition">
                          {label}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )
        )}

        {/* Top matches */}
        {recentMatches.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Top matches</h2>
                <p className="text-xs text-muted-foreground">Ranked by AI fit score</p>
              </div>
              <Link href="/matches" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentMatches.map((m) => {
                const job = m.jobs;
                const company = job?.companies;
                const verdictColor =
                  m.verdict === "strong_fit" ? "text-emerald-400" :
                  m.verdict === "stretch" ? "text-amber-400" :
                  "text-muted-foreground";
                const verdictLabel =
                  m.verdict === "strong_fit" ? "Strong" :
                  m.verdict === "stretch" ? "Stretch" :
                  m.verdict === "off_target" ? "Off-target" :
                  m.verdict === "underqualified" ? "Under" : "—";
                return (
                  <Link
                    key={m.job_id}
                    href={`/jobs/${m.job_id}`}
                    className="group flex items-center gap-3 rounded-xl border border-transparent bg-secondary/30 px-3 py-2.5 transition hover:border-primary/20 hover:bg-secondary/60"
                  >
                    <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-primary transition">{job?.title ?? "Role"}</p>
                      <p className="truncate text-xs text-muted-foreground">{company?.name ?? "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold tabular-nums">{Math.round(m.score)}</span>
                      <span className={`text-[10px] font-medium ${verdictColor}`}>{verdictLabel}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentApps.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Recent activity</h2>
                <p className="text-xs text-muted-foreground">Your application history</p>
              </div>
              <Link href="/applications" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentApps.map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-transparent bg-secondary/30 px-3 py-2.5 transition hover:border-primary/20 hover:bg-secondary/60"
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
          </div>
        )}

        {/* Hiring this week — real job data */}
        {topActiveCompanies.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Hiring this week</h2>
                <p className="text-xs text-muted-foreground">New roles at product companies · live data</p>
              </div>
              <Link href="/insights" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                Full report <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {topActiveCompanies.map(({ name, slug, logo_url, count }) => (
                <div key={slug} className="flex items-center gap-3">
                  <CompanyLogo name={name} logoUrl={logo_url} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{name}</span>
                  <div className="w-24 overflow-hidden rounded-full bg-secondary/60">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-primary/40 to-primary/70 transition-all duration-700"
                      style={{ width: `${(count / (topActiveCompanies[0]?.count ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">+{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground/50">
              Official career pages only · refreshed daily via crawler
            </p>
          </div>
        )}

        {/* Market intelligence — personalized */}
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Market intelligence</h2>
              <p className="text-xs text-muted-foreground">
                {marketRoleLabel ?? "India product-company trends"}
              </p>
            </div>
            <Link href="/insights" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
              Explore <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {marketSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Catalog is still warming up — check back after the next crawl.
              </p>
            ) : marketSignals.map(({ key, label, demand, trend, thisWeek, color }) => {
              const trendTone =
                trend === null              ? "text-muted-foreground/60"
                : trend.startsWith("+")     ? "text-emerald-400"
                : "text-rose-400";
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-xs text-muted-foreground truncate" title={`${thisWeek} new in last 7d`}>{label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary/60">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${demand}%` }} />
                  </div>
                  <span className={`w-14 shrink-0 text-right text-[11px] font-medium tabular-nums ${trendTone}`}>
                    {trend ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground/60">
            Demand = active roles per family · Trend = this week vs prior week · Source: 18 official career pages
          </p>
        </div>

        {/* All done */}
        {allDone && (appCount ?? 0) === 0 && (
          <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold">You&apos;re set up!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start tracking your applications to unlock pipeline analytics.
              </p>
              <Link
                href="/applications"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:underline"
              >
                Track an application <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick links row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/matches", icon: <Briefcase className="h-4 w-4" />, label: "Browse matches", color: "text-violet-400" },
          { href: "/coach", icon: <Sparkles className="h-4 w-4" />, label: "AI Coach", color: "text-primary" },
          { href: "/insights", icon: <BarChart3 className="h-4 w-4" />, label: "Market insights", color: "text-amber-400" },
          { href: "/applications", icon: <Clock className="h-4 w-4" />, label: "Applications", color: "text-emerald-400" },
        ].map(({ href, icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/30 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/20 hover:bg-card/60 hover:text-foreground"
          >
            <span className={`shrink-0 transition group-hover:scale-110 ${color}`}>{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type ColorName = "primary" | "violet" | "emerald" | "amber";

const COLOR_CLASSES: Record<ColorName, { icon: string; badge: string }> = {
  primary: { icon: "bg-primary/10 text-primary", badge: "bg-primary/10 text-primary" },
  violet:  { icon: "bg-violet-400/10 text-violet-400", badge: "bg-violet-400/10 text-violet-400" },
  emerald: { icon: "bg-emerald-400/10 text-emerald-400", badge: "bg-emerald-400/10 text-emerald-400" },
  amber:   { icon: "bg-amber-400/10 text-amber-400", badge: "bg-amber-400/10 text-amber-400" },
};

function StatCard({
  icon, label, value, sub, href, color, badge, badgeColor = "primary",
}: {
  icon: React.ReactNode; label: string; value: string;
  sub: string; href: string; color: ColorName;
  badge?: string; badgeColor?: ColorName;
}) {
  const cls = COLOR_CLASSES[color];
  const badgeCls = COLOR_CLASSES[badgeColor];
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-5 transition hover:border-primary/20 hover:bg-card/60"
    >
      <div aria-hidden className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-current/5 blur-2xl transition group-hover:bg-current/10" />
      <div className={`relative mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cls.icon}`}>
        {icon}
      </div>
      <div className="relative flex items-end justify-between">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {badge && (
          <span className={`mb-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeCls.badge}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="relative mt-0.5 text-xs text-muted-foreground">{label}</p>
      <p className="relative text-[10px] text-muted-foreground/70">{sub}</p>
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
