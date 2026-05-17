import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Activity, TrendingUp, AlertTriangle, IndianRupee, Sparkles,
  Building2, Lightbulb,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { Tooltip } from "@/components/tooltip";
import { SectionCard, StatCard } from "@/components/section-card";
import {
  type JobLite, type CompanyLite,
  aggregate, applyJobFilters, adjacencyUnlocks, companyStackDemand,
} from "@/lib/insights/aggregate";
import { InsightsFilters } from "./filters";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ seniority?: string; hub?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const sp = await searchParams;
  const seniority = sp.seniority || null;
  const hub = sp.hub || null;

  const since7d  = new Date(Date.now() - 7  * 24 * 3_600_000).toISOString();
  const since14d = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  const [{ data: profile }, { data: rawJobs }, { data: companies }, { data: recentJobs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tech_stack, seniority, target_lpa, current_lpa, preferred_hubs")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id, company_id, tech_stack, seniority, comp_lpa_min, comp_lpa_max, hubs")
      .eq("is_active", true),
    supabase.from("companies").select("id, name, slug, logo_url"),
    supabase
      .from("jobs")
      .select("company_id, created_at")
      .eq("is_active", true)
      .gte("created_at", since14d),
  ]);

  const allJobs = (rawJobs as JobLite[] | null) ?? [];
  const filteredJobs = applyJobFilters(allJobs, { seniority, hub });
  const companyMap = new Map<string, CompanyLite>(
    ((companies as CompanyLite[]) ?? []).map((c) => [c.id, c]),
  );

  const agg = aggregate(filteredJobs, profile ?? null);
  const adjacency = adjacencyUnlocks(filteredJobs, profile ?? null, 5);
  const compDemand = companyStackDemand(filteredJobs, profile ?? null).slice(0, 6);

  const maxDemand = Math.max(1, ...agg.demand.values());
  const isFiltered = Boolean(seniority || hub);

  // Week-over-week company hiring momentum
  type MomentumEntry = { companyId: string; thisWeek: number; priorWeek: number; delta: number };
  const momentumMap = new Map<string, { thisWeek: number; priorWeek: number }>();
  for (const j of (recentJobs ?? []) as Array<{ company_id: string; created_at: string }>) {
    const isThisWeek = j.created_at >= since7d;
    const m = momentumMap.get(j.company_id) ?? { thisWeek: 0, priorWeek: 0 };
    if (isThisWeek) m.thisWeek++; else m.priorWeek++;
    momentumMap.set(j.company_id, m);
  }
  const companyMomentum: MomentumEntry[] = [...momentumMap.entries()]
    .map(([companyId, { thisWeek, priorWeek }]) => ({ companyId, thisWeek, priorWeek, delta: thisWeek - priorWeek }))
    .filter(m => m.thisWeek > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek || b.delta - a.delta)
    .slice(0, 8);

  const coverageTone: "success" | "warning" | "destructive" =
    agg.coverage >= 60 ? "success" : agg.coverage >= 30 ? "warning" : "destructive";

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live read on what India&apos;s product companies are actually hiring for, mapped against your profile.
          </p>
        </div>
      </div>

      <InsightsFilters seniority={seniority} hub={hub} />

      {filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {allJobs.length === 0
              ? "We're still ingesting jobs from official career pages. Check back once the daily crawler completes."
              : "No active roles match this slice. Try clearing or widening the filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Activity className="h-4 w-4" />}
              label={isFiltered ? "Active roles in slice" : "Active roles"}
              value={filteredJobs.length}
              tone="primary"
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Top 30 stack coverage"
              value={`${agg.coverage}%`}
              tone={coverageTone}
              sub="of in-demand technologies"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="In your stack"
              value={agg.yours.length}
              tone="primary"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Top gaps"
              value={agg.gaps.length}
              tone="warning"
            />
          </div>

          {/* Stack heatmap */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard
              title="Your stack × market demand"
              subtitle="How widely your existing skills appear in live JDs"
              actionHref="/profile"
              actionLabel="Edit profile"
            >
              {agg.yours.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Upload a resume so we can map your stack against the market.
                </p>
              ) : (
                <ul className="space-y-3">
                  {agg.yours.map((y) => (
                    <DemandBar
                      key={y.canon}
                      label={y.label}
                      value={y.jobs}
                      maxValue={maxDemand}
                      total={filteredJobs.length}
                      tone="primary"
                      inTop30={agg.top30Set.has(y.canon)}
                    />
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Top market demand you don't cover"
              subtitle="Skills appearing in many active roles, missing from your resume"
            >
              {agg.gaps.length === 0 ? (
                <p className="text-sm text-success">
                  Your resume covers every top-demand technology. Nice.
                </p>
              ) : (
                <ul className="space-y-3">
                  {agg.gaps.map((g) => (
                    <DemandBar
                      key={g.canon}
                      label={g.label}
                      value={g.jobs}
                      maxValue={maxDemand}
                      total={filteredJobs.length}
                      tone="warning"
                    />
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Adjacency unlocks */}
          {adjacency.length > 0 && (
            <SectionCard
              title="High-leverage next skills"
              subtitle="Single skills that push you over a 60% overlap threshold for more roles"
              icon={<Lightbulb className="h-4 w-4" />}
              badge={
                <Tooltip label="Skills where adding just this one would push you over a 60% stack-overlap threshold for additional roles you don't currently match.">
                  <span className="cursor-help rounded-full border border-border bg-secondary px-1.5 text-[10px] font-semibold text-muted-foreground">?</span>
                </Tooltip>
              }
              actionHref="/coach"
              actionLabel="Open Coach"
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {adjacency.map((a) => (
                  <li
                    key={a.canon}
                    className="rounded-lg border border-border bg-secondary/40 p-4 transition hover:border-primary/30 hover:bg-secondary"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{a.label}</span>
                      <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary-soft-foreground">
                        +{a.unlocked} roles
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Unlocks {a.unlocked} additional role{a.unlocked === 1 ? "" : "s"} where you currently miss the bar.
                      {" "}
                      <span className="opacity-70">{a.totalDemand} total mentions.</span>
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Company hiring momentum */}
          {companyMomentum.length > 0 && (
            <SectionCard
              title="Company hiring momentum"
              subtitle="Roles added this week vs prior week — official career pages only"
              icon={<Activity className="h-4 w-4" />}
              badge={
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  last 7 days
                </span>
              }
              footer="Refreshed daily via crawler"
            >
              <div className="space-y-3">
                {companyMomentum.map(({ companyId, thisWeek, delta }) => {
                  const co = companyMap.get(companyId);
                  if (!co) return null;
                  const maxThisWeek = companyMomentum[0]?.thisWeek ?? 1;
                  const deltaTone = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
                  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";
                  return (
                    <div key={companyId} className="flex items-center gap-3">
                      <CompanyLogo name={co.name} logoUrl={co.logo_url} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm">{co.name}</span>
                      <div className="hidden w-28 overflow-hidden rounded-full bg-secondary sm:block">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${(thisWeek / maxThisWeek) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums">{thisWeek}</span>
                      <span className={`w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums ${deltaTone}`}>{deltaLabel}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Companies hiring most for your stack */}
          {compDemand.length > 0 && (
            <SectionCard
              title="Where your stack is in demand"
              subtitle="Companies whose live roles match what you already do"
              icon={<Building2 className="h-4 w-4" />}
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {compDemand.map((c) => {
                  const co = companyMap.get(c.companyId);
                  if (!co) return null;
                  const topMatched = [...c.matchedTechs.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([k]) => k);
                  return (
                    <li key={c.companyId} className="rounded-lg border border-border bg-secondary/40 p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <CompanyLogo name={co.name} logoUrl={co.logo_url} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{co.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {c.rolesMatchingStack}/{c.rolesTotal} roles match
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topMatched.map((t) => (
                          <span key={t} className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}

          {/* Comp benchmarks + hubs */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="Compensation benchmarks"
                subtitle="From active roles where companies publish a max LPA"
                icon={<IndianRupee className="h-4 w-4" />}
                footer="Your seniority band is highlighted"
              >
                {agg.compStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not enough comp data published on official career pages yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Seniority</th>
                          <th className="px-4 py-2 text-right font-semibold">Median LPA</th>
                          <th className="px-4 py-2 text-right font-semibold">Top 10%</th>
                          <th className="px-4 py-2 text-right font-semibold">Roles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agg.compStats.map((row, i) => {
                          const isUserBand = profile?.seniority === row.seniority;
                          return (
                            <tr
                              key={row.seniority}
                              className={`${isUserBand ? "bg-primary-soft" : i > 0 ? "border-t border-border" : ""}`}
                            >
                              <td className="px-4 py-2.5 capitalize">
                                {row.seniority}
                                {isUserBand && (
                                  <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                    you
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums">₹{row.median} L</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-success">₹{row.top} L</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.n}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Hiring hubs" subtitle="Active roles by location">
              <ul className="space-y-2.5">
                {agg.topHubs.map(([h, n]) => (
                  <li key={h} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm">{h}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        style={{ width: `${(n / Math.max(1, agg.topHubs[0][1])) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DemandBar({
  label, value, maxValue, total, tone, inTop30,
}: {
  label: string; value: number; maxValue: number; total: number;
  tone: "primary" | "warning";
  inTop30?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const fill = tone === "primary" ? "bg-primary" : "bg-warning";

  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
          <span className="truncate">{label}</span>
          {inTop30 && (
            <span
              title="In the top 30 most-demanded skills"
              className="shrink-0 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-success"
            >
              Top 30
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {value} <span className="opacity-60">· {pct}%</span>
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${fill}`}
          style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}
