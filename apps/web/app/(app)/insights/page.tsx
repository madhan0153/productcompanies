import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity, TrendingUp, AlertTriangle, IndianRupee, Sparkles,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Tooltip } from "@/components/tooltip";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

type JobLite = {
  tech_stack: string[] | null;
  seniority: string | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
  hubs: string[] | null;
};

// Normalise a tech token so "react.js", "ReactJS", "react" all collapse to "react".
function normTech(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "").replace(/[.\-_]/g, "").replace(/js$/, "");
}

// Display form: title-case the canonical token.
function displayTech(canon: string, samples: Map<string, string>): string {
  return samples.get(canon) ?? canon;
}

export default async function InsightsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: rawJobs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tech_stack, seniority, target_lpa, current_lpa, preferred_hubs")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("tech_stack, seniority, comp_lpa_min, comp_lpa_max, hubs")
      .eq("is_active", true),
  ]);

  const jobs = (rawJobs as JobLite[] | null) ?? [];
  const totalJobs = jobs.length;

  // ── Aggregate tech demand ──────────────────────────────────────────────────
  const demand = new Map<string, number>();
  const sample = new Map<string, string>(); // canonical → first-seen display form

  for (const j of jobs) {
    const seen = new Set<string>();
    for (const t of j.tech_stack ?? []) {
      const c = normTech(t);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      demand.set(c, (demand.get(c) ?? 0) + 1);
      if (!sample.has(c)) sample.set(c, t);
    }
  }

  const userTech = new Set(
    (profile?.tech_stack ?? []).map(normTech).filter(Boolean),
  );
  const userTechDisplay = new Map<string, string>(
    (profile?.tech_stack ?? []).map((t) => [normTech(t), t]),
  );

  // Your stack vs market
  const yours = [...userTech]
    .map((c) => ({
      canon: c,
      label: userTechDisplay.get(c) ?? sample.get(c) ?? c,
      jobs: demand.get(c) ?? 0,
    }))
    .sort((a, b) => b.jobs - a.jobs);

  // Top market gaps — most-demanded techs you lack
  const gaps = [...demand.entries()]
    .filter(([c]) => !userTech.has(c))
    .map(([c, n]) => ({ canon: c, label: displayTech(c, sample), jobs: n }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 10);

  const maxDemand = Math.max(1, ...demand.values());

  // ── Comp benchmarks per seniority ──────────────────────────────────────────
  const seniorities = [
    "junior", "mid", "senior", "staff", "principal", "manager", "director",
  ] as const;
  const compStats = seniorities
    .map((s) => {
      const buckets = jobs
        .filter((j) => j.seniority === s && (j.comp_lpa_max ?? j.comp_lpa_min))
        .map((j) => j.comp_lpa_max ?? j.comp_lpa_min ?? 0);
      if (buckets.length === 0) return null;
      buckets.sort((a, b) => a - b);
      const median = buckets[Math.floor(buckets.length / 2)];
      const top = buckets[Math.floor(buckets.length * 0.9)] ?? buckets[buckets.length - 1];
      return { seniority: s, n: buckets.length, median, top };
    })
    .filter((x) => x !== null) as Array<{ seniority: string; n: number; median: number; top: number }>;

  // ── Hub demand ─────────────────────────────────────────────────────────────
  const hubDemand = new Map<string, number>();
  for (const j of jobs) {
    for (const h of j.hubs ?? []) hubDemand.set(h, (hubDemand.get(h) ?? 0) + 1);
  }
  const topHubs = [...hubDemand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Coverage = portion of user's stack that overlaps with the top 30 in-demand techs
  const top30 = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c]) => c);
  const overlap = top30.filter((c) => userTech.has(c)).length;
  const coverage = top30.length > 0 ? Math.round((overlap / top30.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A live read on what India&apos;s product companies are actually hiring for, mapped against your profile.
        </p>
      </div>

      {totalJobs === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            We&apos;re still ingesting jobs from official career pages. Check back once the daily crawler completes.
          </p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Activity className="h-4 w-4" />}
              label="Active roles"
              value={totalJobs}
              tone="text-primary"
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Coverage of top 30 stacks"
              value={`${coverage}%`}
              tone={coverage >= 60 ? "text-emerald-400" : coverage >= 30 ? "text-amber-400" : "text-rose-400"}
              tooltip="What share of the 30 most-demanded technologies appear in your resume."
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="In your stack"
              value={yours.length}
              tone="text-violet-400"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Top gaps"
              value={gaps.length}
              tone="text-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Your stack × demand */}
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-sm font-semibold">Your stack × market demand</h2>
                <Link href="/profile" className="text-xs text-muted-foreground hover:text-foreground transition">
                  Edit profile →
                </Link>
              </header>

              {yours.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Upload a resume so we can map your stack against the market.
                </p>
              ) : (
                <ul className="space-y-3">
                  {yours.map((y) => (
                    <DemandBar
                      key={y.canon}
                      label={y.label}
                      value={y.jobs}
                      maxValue={maxDemand}
                      total={totalJobs}
                      tone="primary"
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Gaps */}
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift">
              <header className="mb-4">
                <h2 className="font-display text-sm font-semibold">Top market demand you don&apos;t cover</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Skills appearing in many active roles that aren&apos;t in your resume yet.
                </p>
              </header>

              {gaps.length === 0 ? (
                <p className="text-sm text-emerald-400">
                  Your resume covers every top-demand technology. Nice.
                </p>
              ) : (
                <ul className="space-y-3">
                  {gaps.map((g) => (
                    <DemandBar
                      key={g.canon}
                      label={g.label}
                      value={g.jobs}
                      maxValue={maxDemand}
                      total={totalJobs}
                      tone="warm"
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Comp benchmarks + hubs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card/40 p-5 lift lg:col-span-2">
              <header className="mb-4 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Compensation benchmarks</h2>
              </header>
              {compStats.length === 0 ? (
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
                      {compStats.map((row) => {
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
                {topHubs.map(([hub, n]) => (
                  <li key={hub} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">{hub}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cool to-primary"
                        style={{ width: `${(n / Math.max(1, topHubs[0][1])) * 100}%` }}
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
  label, value, maxValue, total, tone,
}: {
  label: string; value: number; maxValue: number; total: number;
  tone: "primary" | "warm";
}) {
  const pct = Math.round((value / total) * 100);
  const fill = tone === "primary"
    ? "bg-gradient-to-r from-primary to-glow"
    : "bg-gradient-to-r from-warm to-amber-500";

  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {value} <span className="opacity-60">· {pct}%</span>
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fill}`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
    </li>
  );
}
