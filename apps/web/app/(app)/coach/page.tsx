import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, Target, GraduationCap, Building2, FileEdit,
  CalendarDays, ArrowRight, IndianRupee, TrendingUp,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
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

  // Comp gap to top 10% in your seniority band
  const compTopForBand = profile?.seniority
    ? agg.compStats.find((c) => c.seniority === profile.seniority)?.top ?? null
    : null;
  const compGap = compTopForBand && profile?.target_lpa
    ? compTopForBand - profile.target_lpa
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Compass className="h-3 w-3" /> Coach
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your career coach</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A focused 90-day plan tied to live demand from the 18 approved product companies — generated from your stack, your gaps, and what the market is actually paying.
          </p>
        </div>
        {hasResume && jobs.length > 0 && <GenerateButton hasPlan={Boolean(plan)} />}
      </header>

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
          {/* Snapshot */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SnapshotCard
              icon={<Target className="h-4 w-4" />}
              tone="text-primary"
              label="Stack coverage"
              value={`${agg.coverage}%`}
              hint="of the top 30 in-demand technologies"
            />
            <SnapshotCard
              icon={<TrendingUp className="h-4 w-4" />}
              tone="text-amber-400"
              label="High-leverage adjacencies"
              value={adjacency.length.toString()}
              hint="single skills that unlock 2+ extra roles"
            />
            <SnapshotCard
              icon={<IndianRupee className="h-4 w-4" />}
              tone="text-emerald-400"
              label="Top 10% in your band"
              value={compTopForBand ? `₹${compTopForBand} L` : "—"}
              hint={compGap !== null
                ? compGap > 0
                  ? `₹${compGap} L above your current target`
                  : "You're already targeting the top decile"
                : "Set a target LPA in your profile"}
            />
          </section>

          {/* Heuristic priority skills (always available, even before plan) */}
          {adjacency.length > 0 && (
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Highest-leverage skills to add</h2>
                <Link href="/insights" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition">
                  See full insights →
                </Link>
              </header>
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {adjacency.map((a, i) => (
                  <li key={a.canon} className="rounded-xl border border-border bg-card/60 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{a.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unlocks {a.unlocked} additional role{a.unlocked === 1 ? "" : "s"}; {a.totalDemand} total mentions in active JDs.
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Heuristic target shortlist (always available) */}
          {compDemand.length > 0 && (
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Where to focus your applications</h2>
              </header>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {compDemand.map((c) => {
                  const co = companyById.get(c.companyId);
                  if (!co) return null;
                  return (
                    <li key={c.companyId} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
                      <CompanyLogo name={co.name} logoUrl={co.logo_url} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{co.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {c.rolesMatchingStack}/{c.rolesTotal} roles match your stack
                        </p>
                      </div>
                      <Link
                        href={`/matches?company=${co.slug}`}
                        className="ml-auto rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        View
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* AI-generated 90-day plan */}
          {plan ? (
            <PlanCard plan={plan} generatedAt={profile?.coach_plan_at ?? null} companyByName={companyByName} />
          ) : (
            <section className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-glow/10 to-transparent text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <h2 className="font-display text-base font-semibold">Generate your 90-day plan</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                We&apos;ll synthesise your stack, your gaps, and live JD signal into a four- or five-phase plan that ladders up to a real shippable artefact. Costs only Gemini Flash tokens — about a second.
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" /> Use the &quot;Generate plan&quot; button at the top right.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SnapshotCard({
  icon, label, value, tone, hint,
}: {
  icon: React.ReactNode; label: string; value: string; tone: string; hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 lift">
      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-current/10 ${tone}`}>
        {icon}
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>
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
    <section className="space-y-6 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card/40 to-card/40 p-6 lift">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary">Your plan</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{plan.headline}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{plan.thesis}</p>
        </div>
        {generatedAt && (
          <p className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            Generated {formatDate(generatedAt)}
          </p>
        )}
      </header>

      {/* Priority skills */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" /> Priority skills
        </h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {plan.priority_skills.map((s, i) => (
            <li key={i} className="rounded-xl border border-border bg-card/60 p-4">
              <p className="font-medium">{s.skill}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.why}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* 90-day phases */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> 90-day plan
        </h3>
        <ol className="space-y-3">
          {plan.ninety_day_plan.map((phase, i) => (
            <li
              key={i}
              className="relative rounded-xl border border-border bg-card/60 p-4 pl-6"
            >
              <span className="absolute left-2 top-4 h-[calc(100%-2rem)] w-px bg-border/80" aria-hidden />
              <span className="absolute left-1 top-3.5 h-3 w-3 rounded-full border-2 border-primary bg-card" aria-hidden />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  {phase.week_range}
                </span>
                <p className="text-sm font-medium">{phase.theme}</p>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {phase.focus.map((f, j) => (
                  <li key={j}>· {f}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                <span className="font-medium text-emerald-400">Ship: </span>
                <span className="text-muted-foreground">{phase.deliverable}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Resume tweaks */}
      {plan.resume_tweaks.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <FileEdit className="h-3.5 w-3.5" /> Resume tweaks
          </h3>
          <ul className="space-y-1.5">
            {plan.resume_tweaks.map((t, i) => (
              <li key={i} className="rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target companies */}
      {plan.target_companies.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Target companies
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {plan.target_companies.map((tc, i) => {
              const c = companyByName.get(tc.company.toLowerCase());
              return (
                <li key={i} className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-center gap-2">
                    {c
                      ? <CompanyLogo name={c.name} logoUrl={c.logo_url} size={28} />
                      : <div className="h-7 w-7 rounded-md bg-secondary" aria-hidden />}
                    <p className="truncate text-sm font-medium">{tc.company}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{tc.reason}</p>
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
