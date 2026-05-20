// Adaptive Crawler Intelligence dashboard.
//
// Scrapling-inspired resilience view. Shows per-company resilience score,
// adaptive coverage, fixture coverage, drift watchlist, and a mini sparkline
// of recent crawl run statuses. Mobile-first: stacked cards on narrow
// viewports, grid on desktop. Reduced-motion-safe.
//
// Auth: ADMIN_EMAILS allowlist. Non-admins get notFound().

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ShieldAlert, Fingerprint,
  FileCheck, AlertTriangle, Clock, CheckCircle2, XCircle,
  AlertCircle, Activity, Layers,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
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

export default async function CrawlerIntelPage() {
  const gate = await requireAdmin();
  if (!gate.isAdmin) notFound();

  const admin = createSupabaseAdminClient();
  const since14d = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();

  const [{ data: companies }, { data: recentRuns }] = await Promise.all([
    admin.from("companies").select("id, name, slug").order("name") as any,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false }) as any,
  ]);

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of recentRuns ?? []) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }

  const { overall, perCompany } = scoreFleet(
    (companies ?? []) as CompanyRow[],
    runsByCompany,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
          <ShieldAlert className="h-3 w-3" /> Admin
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Crawler Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Adaptive resilience view &mdash; Scrapling-inspired selector health, drift detection, and fixture coverage.
        </p>
      </header>

      {/* Fleet summary */}
      <FleetSummary overall={overall} total={perCompany.length} />

      {/* Drift watchlist — companies with grade D or C first */}
      <DriftWatchlist items={perCompany.filter((c) => c.driftFlag || c.staleFlag)} />

      {/* Per-company cards */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-primary" />
          Per-company resilience
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perCompany.map((c) => (
            <CompanyCard key={c.company.id} r={c} />
          ))}
        </div>
      </section>
    </div>
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

function CompanyCard({ r }: { r: CompanyResilience }) {
  const gradeColor = gradeTone(r.grade);
  const statusMeta = STATUS_META[r.latestStatus];
  const when = r.latestAt ? timeAgo(new Date(r.latestAt)) : "—";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4">
      {/* Top row: name + grade */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{r.company.name}</p>
          <p className="text-[11px] text-muted-foreground">{r.company.slug}</p>
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
