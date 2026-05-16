import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity, TrendingUp, AlertTriangle, IndianRupee, Sparkles,
  Building2, Lightbulb, ArrowRight,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { Tooltip } from "@/components/tooltip";
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

  // Compute week-over-week company hiring momentum
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A live read on what India&apos;s product companies are actually hiring for, mapped against your profile.
          </p>
        </div>
      </div>

      <InsightsFilters seniority={seniority} hub={hub} />

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {allJobs.length === 0
              ? "We're still ingesting jobs from official career pages. Check back once the daily crawler completes."
              : "No active roles match this slice. Try clearing or widening the filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Activity className="h-4 w-4" />}
              label={isFiltered ? "Active roles in slice" : "Active roles"}
              value={filteredJobs.length}
              tone="text-primary"
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Coverage of top 30 stacks"
              value={`${agg.coverage}%`}
              tone={agg.coverage >= 60 ? "text-emerald-400" : agg.coverage >= 30 ? "text-amber-400" : "text-rose-400"}
              tooltip="What share of the 30 most-demanded technologies appear in your resume."
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="In your stack"
              value={agg.yours.length}
              tone="text-violet-400"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Top gaps"
              value={agg.gaps.length}
              tone="text-amber-400"
            />
          </div>

          {/* Stack heatmap */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-sm font-semibold">Your stack × market demand</h2>
                <Link href="/profile" className="text-xs text-muted-foreground hover:text-foreground transition">
                  Edit profile →
                </Link>
              </header>

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
            </section>

            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4">
                <h2 className="font-display text-sm font-semibold">Top market demand you don&apos;t cover</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Skills appearing in many active roles that aren&apos;t in your resume yet.
                </p>
              </header>

              {agg.gaps.length === 0 ? (
                <p className="text-sm text-emerald-400">
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
                      tone="warm"
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Adjacency unlocks — high-leverage skills to learn next */}
          {adjacency.length > 0 && (
            <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card/40 to-card/40 p-5 lift">
              <header className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">High-leverage next skills</h2>
                <Tooltip label="Skills where adding just this one would push you over a 60% stack-overlap threshold for additional roles you don't currently match.">
                  <span className="cursor-help rounded-full border border-border px-1.5 text-[10px] text-muted-foreground">?</span>
                </Tooltip>
                <Link href="/coach" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:opacity-80">
                  Open Coach <ArrowRight className="h-3 w-3" />
                </Link>
              </header>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {adjacency.map((a) => (
                  <li
                    key={a.canon}
                    className="group rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/40"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{a.label}</span>
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        +{a.unlocked} roles
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unlocks {a.unlocked} additional role{a.unlocked === 1 ? "" : "s"} where you currently miss the bar.
                      {" "}
                      <span className="opacity-70">{a.totalDemand} total mentions.</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Company hiring momentum — week-over-week */}
          {companyMomentum.length > 0 && (
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Company hiring momentum</h2>
                <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  last 7 days · real data
                </span>
              </header>
              <div className="space-y-3">
                {companyMomentum.map(({ companyId, thisWeek, delta }) => {
                  const co = companyMap.get(companyId);
                  if (!co) return null;
                  const maxThisWeek = companyMomentum[0]?.thisWeek ?? 1;
                  const deltaColor = delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-muted-foreground";
                  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";
                  return (
                    <div key={companyId} className="flex items-center gap-3">
                      <CompanyLogo name={co.name} logoUrl={co.logo_url} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{co.name}</span>
                      <div className="w-28 overflow-hidden rounded-full bg-secondary/60">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-primary/50 to-primary/80 transition-all duration-700"
                          style={{ width: `${(thisWeek / maxThisWeek) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums">{thisWeek}</span>
                      <span className={`w-8 shrink-0 text-right text-[11px] font-medium tabular-nums ${deltaColor}`}>{deltaLabel}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground/50">
                Roles added this week vs. prior week · official career pages only · refreshed daily
              </p>
            </section>
          )}

          {/* Companies hiring most for your stack */}
          {compDemand.length > 0 && (
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Where your stack is in demand</h2>
              </header>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {compDemand.map((c) => {
                  const co = companyMap.get(c.companyId);
                  if (!co) return null;
                  const topMatched = [...c.matchedTechs.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([k]) => k);
                  return (
                    <li key={c.companyId} className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="mb-2 flex items-center gap-3">
                        <CompanyLogo name={co.name} logoUrl={co.logo_url} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{co.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {c.rolesMatchingStack}/{c.rolesTotal} roles match your stack
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topMatched.map((t) => (
                          <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Comp benchmarks + hubs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift lg:col-span-2">
              <header className="mb-4 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Compensation benchmarks</h2>
              </header>
              {agg.compStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not enough comp data published on official career pages yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Seniority</th>
                        <th className="px-4 py-2 text-right">Median LPA</th>
                        <th className="px-4 py-2 text-right">Top 10% LPA</th>
                        <th className="px-4 py-2 text-right">Roles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agg.compStats.map((row) => {
                        const isUserBand = profile?.seniority === row.seniority;
                        return (
                          <tr key={row.seniority} className={isUserBand ? "bg-primary/5" : "border-t border-border"}>
                            <td className="px-4 py-2.5 text-foreground">
                              {row.seniority}
                              {isUserBand && (
                                <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  you
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">₹{row.median} L</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400">₹{row.top} L</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.n}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Computed from active roles where companies publish a max LPA. Your seniority band is highlighted.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4">
                <h2 className="font-display text-sm font-semibold">Hiring hubs</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Active roles by location.</p>
              </header>
              <ul className="space-y-2.5">
                {agg.topHubs.map(([h, n]) => (
                  <li key={h} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">{h}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cool to-primary"
                        style={{ width: `${(n / Math.max(1, agg.topHubs[0][1])) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, tone, tooltip,
}: {
  icon: React.ReactNode; label: string; value: number | string; tone: string; tooltip?: string;
}) {
  const card = (
    <div className="rounded-2xl border border-border bg-card/40 p-4 lift">
      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-current/10 ${tone}`}>
        {icon}
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
  return tooltip ? <Tooltip label={tooltip}>{card}</Tooltip> : card;
}

function DemandBar({
  label, value, maxValue, total, tone, inTop30,
}: {
  label: string; value: number; maxValue: number; total: number;
  tone: "primary" | "warm";
  inTop30?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const fill = tone === "primary"
    ? "bg-gradient-to-r from-primary to-glow"
    : "bg-gradient-to-r from-warm to-amber-500";

  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
          <span className="truncate">{label}</span>
          {inTop30 && (
            <span
              title="In the top 30 most-demanded skills"
              className="shrink-0 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-400"
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
          className={`absolute inset-y-0 left-0 rounded-full ${fill}`}
          style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}
