import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, Target, GraduationCap, Building2, FileEdit,
  CalendarDays, IndianRupee, TrendingUp, Sparkles,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { SectionCard, StatCard } from "@/components/section-card";
import {
  type JobLite, type CompanyLite,
  aggregate, adjacencyUnlocks, companyStackDemand,
} from "@/lib/insights/aggregate";
import { GenerateButton } from "./generate-button";
import type { CoachPlan } from "@/lib/llm/prompts/coach-plan";

export const metadata: Metadata = { title: "Coach" };
export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: rawJobs }, { data: companies }] = await Promise.all([
    supabase.from("profiles")
      .select("tech_stack, seniority, target_lpa, current_lpa, years_experience, preferred_hubs, coach_plan, coach_plan_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("jobs")
      .select("id, company_id, tech_stack, seniority, comp_lpa_min, comp_lpa_max, hubs")
      .eq("is_active", true),
    supabase.from("companies").select("id, name, slug, logo_url"),
  ]);

  const jobs = (rawJobs as JobLite[] | null) ?? [];
  const companyList = (companies as CompanyLite[] | null) ?? [];
  const companyByName = new Map(companyList.map((c) => [c.name.toLowerCase(), c]));
  const companyById = new Map(companyList.map((c) => [c.id, c]));

  const agg = aggregate(jobs, profile ?? null);
  const adjacency = adjacencyUnlocks(jobs, profile ?? null, 5);
  const compDemand = companyStackDemand(jobs, profile ?? null).slice(0, 3);

  const plan = (profile?.coach_plan ?? null) as CoachPlan | null;
  const hasResume = (profile?.tech_stack ?? []).length > 0;

  const compTopForBand = profile?.seniority
    ? agg.compStats.find((c) => c.seniority === profile.seniority)?.top ?? null
    : null;
  const compGap = compTopForBand && profile?.target_lpa
    ? compTopForBand - profile.target_lpa
    : null;

  const canGenerate = hasResume && jobs.length > 0;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Career Coach</p>
            <h1 className="mt-0.5 text-lg font-semibold leading-snug sm:text-xl">Your 90-day plan</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Tied to live demand from 18 product companies — built from your stack, your gaps, and what the market is actually paying.
            </p>
          </div>
        </div>

        {canGenerate && (
          <div className="mt-4 border-t border-border pt-4">
            <GenerateButton hasPlan={Boolean(plan)} />
          </div>
        )}
      </div>

      {!hasResume ? (
        <EmptyState
          icon={<GraduationCap className="h-5 w-5" />}
          title="We need your resume first"
          body="Coach builds the plan around your actual stack. Upload a PDF and we'll come back to this."
          actions={[{ label: "Upload resume", href: "/profile", variant: "primary" }]}
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="Waiting for the next crawl"
          body="The plan grounds itself in live job descriptions. The crawler runs daily at 02:00 IST."
        />
      ) : (
        <>
          {/* ── Snapshot stats — horizontal scroll on mobile ─────── */}
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            <div className="w-[72%] shrink-0 snap-start sm:w-auto">
              <StatCard
                icon={<Target className="h-4 w-4" />}
                label="Stack coverage"
                value={`${agg.coverage}%`}
                sub="of the top 30 in-demand technologies"
                tone="primary"
              />
            </div>
            <div className="w-[72%] shrink-0 snap-start sm:w-auto">
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="High-leverage adjacencies"
                value={adjacency.length}
                sub="single skills that unlock 2+ extra roles"
                tone="warning"
              />
            </div>
            <div className="w-[72%] shrink-0 snap-start sm:w-auto">
              <StatCard
                icon={<IndianRupee className="h-4 w-4" />}
                label="Top 10% in your band"
                value={compTopForBand ? `₹${compTopForBand} L` : "—"}
                sub={
                  compGap !== null
                    ? compGap > 0
                      ? `₹${compGap} L above your current target`
                      : "You're already targeting the top decile"
                    : "Set a target LPA in your profile"
                }
                tone="success"
              />
            </div>
          </div>

          {/* ── Highest-leverage skills ───────────────────────────── */}
          {adjacency.length > 0 && (
            <SectionCard
              title="Highest-leverage skills to add"
              subtitle="Single skills that meaningfully widen your matchable role pool"
              icon={<GraduationCap className="h-4 w-4" />}
              actionHref="/insights"
              actionLabel="See full insights"
            >
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {adjacency.map((a, i) => (
                  <li key={a.canon} className="rounded-lg border border-border bg-secondary/40 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-soft-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{a.label}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Unlocks {a.unlocked} additional role{a.unlocked === 1 ? "" : "s"}; {a.totalDemand} total mentions in active JDs.
                    </p>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {/* ── Target companies ──────────────────────────────────── */}
          {compDemand.length > 0 && (
            <SectionCard
              title="Where to focus your applications"
              subtitle="Companies whose live roles match your existing stack"
              icon={<Building2 className="h-4 w-4" />}
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {compDemand.map((c) => {
                  const co = companyById.get(c.companyId);
                  if (!co) return null;
                  return (
                    <li key={c.companyId} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                      <CompanyLogo name={co.name} logoUrl={co.logo_url} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{co.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {c.rolesMatchingStack}/{c.rolesTotal} roles match
                        </p>
                      </div>
                      <Link
                        href={`/matches?c=${co.slug}`}
                        className="press tap-target-sm shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
                      >
                        View
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}

          {/* ── AI-generated 90-day plan ──────────────────────────── */}
          {plan ? (
            <PlanCard plan={plan} generatedAt={profile?.coach_plan_at ?? null} companyByName={companyByName} />
          ) : (
            <section className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center sm:p-8">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">Generate your 90-day plan</h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                We&apos;ll synthesise your stack, gaps, and live JD signal into a phased plan with a real shippable artefact. Takes about a second.
              </p>
              <div className="mt-5 flex justify-center">
                <GenerateButton hasPlan={false} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlanCard({
  plan, generatedAt, companyByName,
}: {
  plan: CoachPlan;
  generatedAt: string | null;
  companyByName: Map<string, CompanyLite>;
}) {
  return (
    <section className="space-y-6 rounded-xl border border-primary/30 bg-primary-soft p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-soft-foreground/80">Your plan</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{plan.headline}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{plan.thesis}</p>
        </div>
        {generatedAt && (
          <p className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            Generated {formatDate(generatedAt)}
          </p>
        )}
      </header>

      {/* Priority skills */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" /> Priority skills
        </h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {plan.priority_skills.map((s, i) => (
            <li key={i} className="rounded-lg border border-border bg-card p-4">
              <p className="font-medium">{s.skill}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.why}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 90-day phases */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> 90-day plan
        </h3>
        <ol className="space-y-3">
          {plan.ninety_day_plan.map((phase, i) => (
            <li
              key={i}
              className="relative rounded-lg border border-border bg-card p-4 pl-6"
            >
              <span className="absolute left-2 top-4 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />
              <span className="absolute left-1 top-3.5 h-3 w-3 rounded-full border-2 border-primary bg-card" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {phase.week_range}
                </span>
                <p className="text-sm font-semibold">{phase.theme}</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {phase.focus.map((f, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                <span className="font-semibold text-success">Ship: </span>
                <span className="text-muted-foreground">{phase.deliverable}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Resume tweaks */}
      {plan.resume_tweaks.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileEdit className="h-3.5 w-3.5" /> Resume tweaks
          </h3>
          <ul className="space-y-1.5">
            {plan.resume_tweaks.map((t, i) => (
              <li key={i} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target companies */}
      {plan.target_companies.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Target companies
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plan.target_companies.map((tc, i) => {
              const c = companyByName.get(tc.company.toLowerCase());
              return (
                <li key={i} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    {c
                      ? <CompanyLogo name={c.name} logoUrl={c.logo_url} size={28} />
                      : <div className="h-7 w-7 rounded-md bg-secondary" aria-hidden />}
                    <p className="truncate text-sm font-semibold">{tc.company}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tc.reason}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}
