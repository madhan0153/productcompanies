// Adaptive Crawler Intelligence dashboard.
// Per-company resilience score, adaptive coverage, fixture coverage,
// drift watchlist, and a 14-day status sparkline. PM-tokens version.

import type { Metadata } from "next";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Clock, FileCheck, Fingerprint, XCircle } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, SectionHeader } from "@/components/admin/pm";
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
    admin.from("companies").select("id, name, slug, logo_url").order("name") as never,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false }) as never,
  ]);

  const companiesWithLogos = ((companies as CompanyRowWithLogo[] | null) ?? []);
  const logoBySlug = new Map(companiesWithLogos.map((c) => [c.slug, c.logo_url]));

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of ((recentRuns as CrawlRunRow[] | null) ?? [])) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }

  const { overall, perCompany } = scoreFleet(
    companiesWithLogos.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    runsByCompany,
  );

  const dailySeries = buildDailySeries(((recentRuns as CrawlRunRow[] | null) ?? []), 14);
  const watchlist   = perCompany.filter((c) => c.driftFlag || c.staleFlag);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Crawler Intelligence
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Crawler Intelligence
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Scrapling-inspired selector health, drift detection, and fixture coverage.
        </p>
      </header>

      <FleetSummary overall={overall} total={perCompany.length} />

      <SectionHeader title="14-day trend" sub="Total crawl runs across all crawlers, colour-coded by status" />
      <FleetTrend series={dailySeries} />

      <SectionHeader title="Watchlist" sub={watchlist.length === 0 ? "No active drift or staleness" : `${watchlist.length} crawler${watchlist.length === 1 ? "" : "s"} need attention`} />
      <DriftWatchlist items={watchlist} />

      <SectionHeader title="Per-company resilience" sub={`${perCompany.length} crawlers`} />
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}>
        {perCompany.map((c) => (
          <CompanyCard key={c.company.id} r={c} logoUrl={logoBySlug.get(c.company.slug) ?? null} />
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FleetSummary({ overall, total }: { overall: OverallResilience; total: number }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      <div style={{
        gridColumn: "span 1",
        padding: 16, borderRadius: 14,
        background: "var(--surface)", border: "1px solid var(--line)",
        boxShadow: "var(--shadow-1)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: gradeBg(overall.fleetGrade),
          color: gradeFg(overall.fleetGrade),
          fontSize: 22, fontWeight: 700, letterSpacing: -0.4,
          border: `1px solid ${gradeBorder(overall.fleetGrade)}`,
        }}>
          {overall.fleetGrade}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500 }}>Fleet score</p>
          <p className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>{overall.fleetScore}</p>
          <p style={{ fontSize: 10, color: "var(--text-3)" }}>{total} crawlers</p>
        </div>
      </div>

      <KPI label="Adaptive coverage" value={`${Math.round(overall.adaptiveCoverage * 100)}%`} hint={`${Math.round(overall.adaptiveCoverage * overall.byKind.htmlDom)}/${overall.byKind.htmlDom} DOM`} />
      <KPI label="Fixture coverage"  value={`${Math.round(overall.fixtureCoverage * 100)}%`}  hint={`${Math.round(overall.fixtureCoverage * overall.byKind.htmlDom)}/${overall.byKind.htmlDom} DOM`} />
      <KPI label="At risk"           value={String(overall.companiesAtRisk)} hint={`${overall.byKind.api}A · ${overall.byKind.htmlDom}D · ${overall.byKind.htmlRegex}R`} />
    </div>
  );
}

function FleetTrend({ series }: { series: ReturnType<typeof buildDailySeries> }) {
  const max = Math.max(1, ...series.map((s) => s.total));
  const totalRuns   = series.reduce((s, x) => s + x.total, 0);
  const successRuns = series.reduce((s, x) => s + x.success, 0);
  const rate = totalRuns === 0 ? 0 : Math.round((successRuns / totalRuns) * 100);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--text-3)" }}>Last 14 days</p>
          <p className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
            {totalRuns} runs
          </p>
        </div>
        <Badge tone={rate >= 80 ? "ok" : rate >= 50 ? "warn" : "err"}>{rate}% success</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
        {series.map((s) => (
          <div
            key={s.date}
            title={`${s.date} · ${s.total} runs · ${s.success} ok · ${s.failed} failed`}
            style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column-reverse", borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}
          >
            {s.success > 0 && <div style={{ background: "var(--ok)",   height: `${(s.success / max) * 100}%`, opacity: 0.85 }} />}
            {s.partial > 0 && <div style={{ background: "var(--warn)", height: `${(s.partial / max) * 100}%`, opacity: 0.85 }} />}
            {s.failed > 0  && <div style={{ background: "var(--err)",  height: `${(s.failed  / max) * 100}%`, opacity: 0.85 }} />}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)" }}>
        <span>{series[0]?.date.slice(5)}</span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </Card>
  );
}

function DriftWatchlist({ items }: { items: CompanyResilience[] }) {
  if (items.length === 0) {
    return (
      <div style={{
        padding: 14, borderRadius: 12,
        background: "var(--ok-soft)",
        border: "1px solid color-mix(in oklab, var(--ok) 30%, transparent)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <CheckCircle2 size={16} style={{ color: "var(--ok)" }} />
        <p style={{ fontSize: 13, color: "var(--ok)", fontWeight: 500 }}>
          No active drift or staleness detected.
        </p>
      </div>
    );
  }
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: "var(--warn-soft)",
      border: "1px solid color-mix(in oklab, var(--warn) 30%, transparent)",
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <AlertTriangle size={16} /> {items.length} crawler{items.length === 1 ? "" : "s"} need attention
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((c) => (
          <li key={c.company.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 500 }}>{c.company.name}</span>
            {c.driftFlag && <Badge tone="err"  size="sm">DRIFT</Badge>}
            {c.staleFlag && <Badge tone="warn" size="sm">STALE</Badge>}
            <span className="pm-num" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
              score {c.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompanyCard({ r, logoUrl }: { r: CompanyResilience; logoUrl: string | null }) {
  const statusMeta = STATUS_META[r.latestStatus];
  const when = r.latestAt ? timeAgo(new Date(r.latestAt)) : "no data";
  return (
    <Card p={14}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <CompanyLogo name={r.company.name} logoUrl={logoUrl} size={32} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.company.name}
            </p>
            <p style={{ fontSize: 10, color: "var(--text-3)" }}>{r.company.slug}</p>
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: gradeBg(r.grade),
          color: gradeFg(r.grade),
          fontSize: 14, fontWeight: 700,
          border: `1px solid ${gradeBorder(r.grade)}`,
          flexShrink: 0,
        }}>
          {r.grade}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
        {r.meta?.kind === "api"       && <Badge tone="accent"  size="sm">API</Badge>}
        {r.meta?.kind === "html-regex"&& <Badge tone="info"    size="sm">HTML regex</Badge>}
        {r.meta?.kind === "html-dom"  && (r.meta.adaptive
          ? <Badge tone="ok"      size="sm">Adaptive</Badge>
          : <Badge tone="neutral" size="sm">CSS-only</Badge>)}
        {r.meta?.kind !== "api" && (r.meta?.hasFixture
          ? <Badge tone="ok"      size="sm">Fixture</Badge>
          : <Badge tone="neutral" size="sm">No fixture</Badge>)}
        {r.driftFlag && <Badge tone="err"  size="sm">Drift</Badge>}
        {r.staleFlag && <Badge tone="warn" size="sm">Stale</Badge>}
      </div>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 2, height: 10 }}>
        {r.runs.length === 0 ? (
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>No runs in window</span>
        ) : (
          [...r.runs].reverse().slice(-14).map((run, i) => (
            <span
              key={i}
              title={`${run.status} · ${new Date(run.started_at).toLocaleString()}${run.error ? ` · ${run.error}` : ""}`}
              style={{
                display: "block", height: 10, flex: 1, borderRadius: 2,
                background:
                  run.status === "success" ? "var(--ok)" :
                  run.status === "partial" ? "var(--warn)" :
                  run.status === "failed"  ? "var(--err)" :
                                             "var(--accent)",
                opacity: 0.85,
              }}
            />
          ))
        )}
      </div>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: statusMeta.color }}>
          {statusMeta.icon} {statusMeta.label}
        </span>
        <span className="pm-num">{when}</span>
        <span className="pm-num">{Math.round(r.successRate * 100)}% ok</span>
      </div>
    </Card>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

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

type CrawlStatus = CompanyResilience["latestStatus"];

const STATUS_META: Record<CrawlStatus, { label: string; color: string; icon: React.ReactNode }> = {
  success: { label: "Healthy", color: "var(--ok)",     icon: <CheckCircle2 size={12} /> },
  partial: { label: "Partial", color: "var(--warn)",   icon: <AlertCircle  size={12} /> },
  failed:  { label: "Failed",  color: "var(--err)",    icon: <XCircle      size={12} /> },
  running: { label: "Running", color: "var(--accent)", icon: <Activity     size={12} /> },
  no_data: { label: "No data", color: "var(--text-3)", icon: <Clock        size={12} /> },
};

function gradeBg(g: CompanyResilience["grade"]): string {
  if (g === "A+" || g === "A") return "var(--ok-soft)";
  if (g === "B")               return "var(--info-soft)";
  if (g === "C")               return "var(--warn-soft)";
  return "var(--err-soft)";
}
function gradeFg(g: CompanyResilience["grade"]): string {
  if (g === "A+" || g === "A") return "var(--ok)";
  if (g === "B")               return "var(--accent)";
  if (g === "C")               return "var(--warn)";
  return "var(--err)";
}
function gradeBorder(g: CompanyResilience["grade"]): string {
  return `color-mix(in oklab, ${gradeFg(g)} 30%, transparent)`;
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

// silence unused-icon imports — these icons are kept for the import set
void [Fingerprint, FileCheck];
