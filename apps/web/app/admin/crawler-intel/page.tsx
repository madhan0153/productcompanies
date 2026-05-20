// Adaptive Crawler Intelligence dashboard.
//
// Scrapling-inspired resilience view. Shows per-company resilience score,
// adaptive coverage, fixture coverage, drift watchlist, and a mini sparkline
// of recent crawl run statuses. Mobile-first: stacked cards on narrow
// viewports, grid on desktop. Reduced-motion-safe.
//
// Auth: the parent /admin/layout.tsx gates non-admins via notFound().

import type { Metadata } from "next";
import {
  Fingerprint, FileCheck, AlertTriangle, Clock, CheckCircle2, XCircle,
  AlertCircle, Activity, Layers, TrendingUp,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  scoreFleet,
  type CrawlRunRow,
  type CompanyRow,
  type CompanyResilience,
  type OverallResilience,
} from "@/lib/admin/crawler-resilience";

export const metadata: Metadata = { title: "Admin · Crawler Intelligence" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CompanyRowWithLogo = CompanyRow & { logo_url: string | null };

export default async function CrawlerIntelPage() {
  const admin = createSupabaseAdminClient();
  const since14d = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  const [{ data: companies }, { data: recentRuns }] = await Promise.all([
    admin.from("companies").select("id, name, slug, logo_url").order("name") as any,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false }) as any,
  ]);

  const companiesWithLogos = (companies ?? []) as CompanyRowWithLogo[];
  const logoBySlug = new Map(companiesWithLogos.map((c) => [c.slug, c.logo_url]));

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of (recentRuns ?? []) as CrawlRunRow[]) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }

  const { overall, perCompany } = scoreFleet(
    companiesWithLogos.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    runsByCompany,
  );

  const dailySeries = buildDailySeries((recentRuns ?? []) as CrawlRunRow[], 14);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Crawler Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Adaptive resilience view. Scrapling-inspired selector health, drift detection, and fixture coverage.
        </p>
      </header>

      <FleetSummary overall={overall} total={perCompany.length} />

      <FleetTrend series={dailySeries} />

      <DriftWatchlist items={perCompany.filter((c) => c.driftFlag || c.staleFlag)} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-primary" />
          Per-company resilience
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perCompany.map((c) => (
            <CompanyCard
              key={c.company.id}
              r={c}
              logoUrl={logoBySlug.get(c.company.slug) ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── 14-day trend ──────────────────────────────────────────────────────────

function buildDailySeries(runs: CrawlRunRow[], days: number) {
  const buckets: { date: string; total: number; success: number; failed: number; partial: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), total: 0, success: 0, failed: 0, partial: 0 });
  }
  const byDate = new Map(buckets.map((b) => [b.date, b]));
  for (const r of runs) {
    const date = r.started_at.slice(0, 10);
    const b = byDate.get(date);
    if (!b) continue;
    b.total++;
    if (r.status === "success") b.success++;
    else if (r.status === "failed") b.failed++;
    else if (r.status === "partial") b.partial++;
  }
  return buckets;
}

function FleetTrend({ series }: { series: ReturnType<typeof buildDailySeries> }) {
  const max = Math.max(1, ...series.map((s) => s.total));
  const totalRuns = series.reduce((s, x) => s + x.total, 0);
  const successRuns = series.reduce((s, x) => s + x.success, 0);
  const rate = totalRuns === 0 ? 0 : Math.round((successRuns / totalRuns) * 100);

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> 14-day trend
          </p>
          <p className="text-[11px] text-muted-foreground">
            Total crawl runs across all 18 crawlers, color-coded by status.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums">{totalRuns}</p>
          <p className="text-[10px] text-muted-foreground">{rate}% success</p>
        </div>
      </div>
      <div className="flex h-16 items-end gap-1">
        {series.map((s) => (
          <div
            key={s.date}
            className="relative flex-1"
            title={`${s.date} - ${s.total} runs - ${s.success} success - ${s.failed} failed`}
          >
            <div className="flex h-full w-full flex-col-reverse overflow-hidden rounded-sm bg-background/40">
              {s.success > 0 && (
                <div className="bg-emerald-500/70" style={{ height: `${(s.success / max) * 100}%` }} />
              )}
              {s.partial > 0 && (
                <div className="bg-amber-500/70" style={{ height: `${(s.partial / max) * 100}%` }} />
              )}
              {s.failed > 0 && (
                <div className="bg-rose-500/70" style={{ height: `${(s.failed / max) * 100}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.date.slice(5)}</span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </section>
  );
}

// ── Fleet summary ──────────────────────────────────────────────────────────

function FleetSummary({ overall, total }: { overall: OverallResilience; total: number }) {
  const gradeColor = gradeTone(overall.fleetGrade);
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card/40 p-4 sm:col-span-1">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold ${gradeColor}`}>
          {overall.fleetGrade}
        </div>
        <div>
          <p className="text-sm font-medium">Fleet score</p>
          <p className="text-2xl font-bold tabular-nums">{overall.fleetScore}</p>
          <p className="text-[10px] text-muted-foreground">{total} crawlers</p>
        </div>
      </div>

      <MiniStat
        icon={<Fingerprint className="h-4 w-4" />}
        label="Adaptive"
        value={`${Math.round(overall.adaptiveCoverage * 100)}%`}
        sub={`${Math.round(overall.adaptiveCoverage * overall.byKind.htmlDom)} of ${overall.byKind.htmlDom} DOM crawlers`}
      />
      <MiniStat
        icon={<FileCheck className="h-4 w-4" />}
        label="Fixtures"
        value={`${Math.round(overall.fixtureCoverage * 100)}%`}
        sub={`${Math.round(overall.fixtureCoverage * overall.byKind.htmlDom)} of ${overall.byKind.htmlDom} DOM crawlers`}
      />
      <MiniStat
        icon={<AlertTriangle className="h-4 w-4" />}
        label="At risk"
        value={String(overall.companiesAtRisk)}
        sub={`${overall.byKind.api} API · ${overall.byKind.htmlDom} DOM · ${overall.byKind.htmlRegex} regex`}
      />
    </section>
  );
}

function MiniStat({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{sub}</p>
    </div>
  );
}

// ── Drift watchlist ────────────────────────────────────────────────────────

function DriftWatchlist({ items }: { items: CompanyResilience[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> No active drift or staleness detected
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-400">
        <AlertTriangle className="h-4 w-4" /> Watchlist &mdash; {items.length} crawler{items.length === 1 ? "" : "s"} need attention
      </p>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.company.id} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{c.company.name}</span>
            {c.driftFlag && (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                DRIFT
              </span>
            )}
            {c.staleFlag && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                STALE
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              score {c.score}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Company card ───────────────────────────────────────────────────────────

function CompanyCard({ r, logoUrl }: { r: CompanyResilience; logoUrl: string | null }) {
  const gradeColor = gradeTone(r.grade);
  const statusMeta = STATUS_META[r.latestStatus];
  const when = r.latestAt ? timeAgo(new Date(r.latestAt)) : "no data";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/30 motion-reduce:transition-none">
      {/* Top row: logo + name + grade */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo name={r.company.name} logoUrl={logoUrl} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{r.company.name}</p>
            <p className="text-[10px] text-muted-foreground">{r.company.slug}</p>
          </div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${gradeColor}`}>
          {r.grade}
        </div>
      </div>

      {/* Badge row */}
      <div className="flex flex-wrap gap-1.5">
        {/* Kind badge — what ingestion strategy this crawler uses. */}
        {r.meta?.kind === "api" && (
          <Badge tone="text-violet-300 border-violet-500/30 bg-violet-500/10" icon={<Activity className="h-2.5 w-2.5" />} label="API" />
        )}
        {r.meta?.kind === "html-regex" && (
          <Badge tone="text-sky-300 border-sky-500/30 bg-sky-500/10" icon={<FileCheck className="h-2.5 w-2.5" />} label="HTML regex" />
        )}
        {r.meta?.kind === "html-dom" && (
          r.meta.adaptive ? (
            <Badge tone="text-emerald-400 border-emerald-500/30 bg-emerald-500/10" icon={<Fingerprint className="h-2.5 w-2.5" />} label="Adaptive" />
          ) : (
            <Badge tone="text-muted-foreground border-border bg-card/30" icon={<Fingerprint className="h-2.5 w-2.5" />} label="CSS-only" />
          )
        )}
        {/* Fixture badge only meaningful for html-dom and html-regex; API has no fixture concept. */}
        {r.meta?.kind !== "api" && (
          r.meta?.hasFixture ? (
            <Badge tone="text-emerald-400 border-emerald-500/30 bg-emerald-500/10" icon={<FileCheck className="h-2.5 w-2.5" />} label="Fixture" />
          ) : (
            <Badge tone="text-muted-foreground border-border bg-card/30" icon={<FileCheck className="h-2.5 w-2.5" />} label="No fixture" />
          )
        )}
        {r.driftFlag && (
          <Badge tone="text-rose-300 border-rose-500/30 bg-rose-500/10" icon={<AlertTriangle className="h-2.5 w-2.5" />} label="Drift" />
        )}
        {r.staleFlag && (
          <Badge tone="text-amber-300 border-amber-500/30 bg-amber-500/10" icon={<Clock className="h-2.5 w-2.5" />} label="Stale" />
        )}
      </div>

      {/* Sparkline */}
      <div className="flex items-center gap-0.5">
        {r.runs.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">No runs in window</span>
        ) : (
          [...r.runs].reverse().slice(-14).map((run, i) => (
            <span
              key={i}
              title={`${run.status} · ${new Date(run.started_at).toLocaleString()}${run.error ? ` · ${run.error}` : ""}`}
              className={`block h-2.5 flex-1 rounded-sm ${
                run.status === "success" ? "bg-emerald-500/70" :
                run.status === "partial" ? "bg-amber-500/70" :
                run.status === "failed"  ? "bg-rose-500/70" :
                                           "bg-sky-500/70"
              }`}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className={`inline-flex items-center gap-1 ${statusMeta.tone}`}>
          {statusMeta.icon} {statusMeta.label}
        </span>
        <span className="tabular-nums">{when}</span>
        <span className="tabular-nums">{Math.round(r.successRate * 100)}% success</span>
      </div>
    </div>
  );
}

function Badge({ tone, icon, label }: { tone: string; icon: React.ReactNode; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
      {icon} {label}
    </span>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────

type CrawlStatus = CompanyResilience["latestStatus"];

const STATUS_META: Record<CrawlStatus, { label: string; tone: string; icon: React.ReactNode }> = {
  success: { label: "Healthy",  tone: "text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  partial: { label: "Partial",  tone: "text-amber-400",   icon: <AlertCircle  className="h-3 w-3" /> },
  failed:  { label: "Failed",   tone: "text-rose-400",    icon: <XCircle      className="h-3 w-3" /> },
  running: { label: "Running",  tone: "text-sky-400",     icon: <Activity     className="h-3 w-3" /> },
  no_data: { label: "No data",  tone: "text-muted-foreground", icon: <AlertCircle className="h-3 w-3" /> },
};

function gradeTone(g: CompanyResilience["grade"]): string {
  switch (g) {
    case "A+": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg";
    case "A":  return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg";
    case "B":  return "bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg";
    case "C":  return "bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg";
    case "D":  return "bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg";
  }
}

function timeAgo(d: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
