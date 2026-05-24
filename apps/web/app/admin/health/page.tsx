// Sprint 3 — Item 12. Admin health dashboard.
//
// One read-only page summarising what the operator needs to know in an
// outage: which crawlers are healthy, the catalog size, parse / apply
// engagement, user counts, and the last 7 days of crawl_runs grouped by
// company. No mutations here — debugging / observability only.
//
// Auth: ADMIN_EMAILS allowlist via /lib/admin/auth.ts. Non-admins get a
// notFound() so the page's existence isn't leaked.

import type { Metadata } from "next";
import {
  Activity, Database, Briefcase, Users, FileCheck,
  Sparkles, BarChart3, CheckCircle2, AlertCircle, XCircle,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin · Health" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CrawlRunStatus = "running" | "success" | "partial" | "failed";

type CrawlRunRow = {
  company_id: string;
  status: CrawlRunStatus;
  finished_at: string | null;
  started_at: string;
  jobs_new: number | null;
  jobs_updated: number | null;
  jobs_marked_stale: number | null;
  error: string | null;
};

type CompanyRow = { id: string; name: string; slug: string };

export default async function AdminHealthPage() {
  // Auth gate handled in /admin/layout.tsx — non-admins never reach here.
  const admin = createSupabaseAdminClient();

  const since7d  = new Date(Date.now() - 7  * 24 * 3_600_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [
    { data: companies },
    { data: recentRuns },
    { count: activeJobCount },
    { count: parsedJobCount },
    { count: unparsedJobCount },
    { data: applyClickSummary },
    { count: userCount },
    { count: usersWithResume },
    { count: usersWithMatches },
    { count: usersComputedLast24h },
    { count: matchesTotal },
    { count: matchesUnseen },
    { count: matchesHidden },
    // Phase R4 — Resume Intelligence ops counters.
    { count: enhancedTotal },
    { count: enhancedFinalised },
    { count: enhancedPending },
    { count: tailoredFinalised },
    intelEventsRecent,
  ] = await Promise.all([

    admin.from("companies").select("id, name, slug").order("name") as any,

    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since7d)
      .order("started_at", { ascending: false }) as any,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).not("jd_parsed_at", "is", null),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).is("jd_parsed_at", null),

    admin
      .from("jobs")
      .select("apply_click_count")
      .eq("is_active", true)
      .gt("apply_click_count", 0)
      .order("apply_click_count", { ascending: false })
      .limit(500) as any,
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_storage_path", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("last_match_compute_at", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_match_compute_at", since24h),
    admin.from("matches").select("user_id", { count: "exact", head: true }),
    admin.from("matches").select("user_id", { count: "exact", head: true }).is("seen_at", null),
    admin.from("matches").select("user_id", { count: "exact", head: true }).eq("user_hidden", true),
    // Resume Intelligence counters
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),

    admin
      .from("resume_intel_events")
      .select("kind, scope, ok, latency_ms, created_at")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1000) as any,
  ]);

  // ── Crawl runs by company ────────────────────────────────────────────────
  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of (recentRuns as CrawlRunRow[] | null) ?? []) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }

  // Health classification — most recent run drives the company status,
  // but we also flag "two-in-a-row partial/failed" as drift.
  type CompanyHealth = {
    company: CompanyRow;
    latestStatus: CrawlRunStatus | "no_data";
    latestAt: string | null;
    twoInARow: boolean;
    runs: CrawlRunRow[];
    runsCount: number;
  };

  const companyHealth: CompanyHealth[] = ((companies as CompanyRow[] | null) ?? []).map((co) => {
    const runs = runsByCompany.get(co.id) ?? [];
    const latest = runs[0];
    const prior  = runs[1];
    const twoInARow =
      !!latest && !!prior &&
      latest.status !== "success" && latest.status !== "running" &&
      prior.status  !== "success" && prior.status  !== "running";
    return {
      company:      co,
      latestStatus: latest?.status ?? "no_data",
      latestAt:     latest?.finished_at ?? latest?.started_at ?? null,
      twoInARow,
      runs:         runs.slice(0, 7),
      runsCount:    runs.length,
    };
  }).sort((a, b) => {
    const rank = (s: CompanyHealth) => (s.twoInARow ? 0 : s.latestStatus === "failed" ? 1 : s.latestStatus === "partial" ? 2 : s.latestStatus === "no_data" ? 3 : 4);
    return rank(a) - rank(b);
  });

  // ── Apply-click totals (top 12 most-clicked active roles) ───────────────
  const applyClicks = ((applyClickSummary as Array<{ apply_click_count: number }> | null) ?? []);
  const totalClicks = applyClicks.reduce((s, x) => s + (x.apply_click_count ?? 0), 0);
  const distinctClickedJobs = applyClicks.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Live operator view. Crawler status, catalog volume, user engagement.
          Refreshed {new Date().toLocaleTimeString()}.
        </p>
      </header>

      {/* ── Headline stats ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Briefcase className="h-4 w-4" />} label="Active jobs"        value={String(activeJobCount ?? 0)}      sub={`${parsedJobCount ?? 0} parsed · ${unparsedJobCount ?? 0} pending`} />
        <Stat icon={<Users     className="h-4 w-4" />} label="Users"              value={String(userCount ?? 0)}           sub={`${usersWithResume ?? 0} with resume · ${usersWithMatches ?? 0} matched`} />
        <Stat icon={<Sparkles  className="h-4 w-4" />} label="Computed 24h"       value={String(usersComputedLast24h ?? 0)} sub="users with last_match_compute_at in last 24h" />
        <Stat icon={<Activity  className="h-4 w-4" />} label="Match rows"         value={String(matchesTotal ?? 0)}        sub={`${matchesUnseen ?? 0} unseen · ${matchesHidden ?? 0} dismissed`} />
      </section>

      {/* ── Apply intent ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card/40">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Apply intent
            </p>
            <p className="text-xs text-muted-foreground">
              Aggregate apply-button clicks across active roles. Drives "hot roles" surface candidates.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div><span className="text-foreground font-semibold tabular-nums">{totalClicks}</span> total clicks</div>
            <div><span className="text-foreground font-semibold tabular-nums">{distinctClickedJobs}</span> roles received clicks</div>
          </div>
        </header>
      </section>

      {/* ── Crawler health by company ─────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card/40">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Crawler health (last 7 days)
            </p>
            <p className="text-xs text-muted-foreground">
              Most recent runs per company. Drift alert fires on failed runs and consecutive partials.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {(recentRuns as CrawlRunRow[] | null)?.length ?? 0} runs
          </div>
        </header>
        <ul className="divide-y divide-border/40">
          {companyHealth.map((c) => (
            <CompanyHealthRow key={c.company.id} h={c} />
          ))}
        </ul>
      </section>

      {/* ── Resume Intelligence ops (Phase R4) ───────────────────────── */}
      <section className="rounded-2xl border border-border bg-card/40">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Resume Intelligence (last 24h)
            </p>
            <p className="text-xs text-muted-foreground">
              Enhanced + Tailored pipeline volume, success rate, and latency. Powers the USP cost model.
            </p>
          </div>
        </header>
        <ResumeIntelSummary
          enhancedTotal={enhancedTotal ?? 0}
          enhancedFinalised={enhancedFinalised ?? 0}
          enhancedPending={enhancedPending ?? 0}
          tailoredFinalised={tailoredFinalised ?? 0}
          events={(intelEventsRecent as IntelEventRow[] | null) ?? []}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card/30">
        <header className="border-b border-border/50 px-5 py-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Configuration
          </p>
        </header>
        <ul className="space-y-2 px-5 py-3 text-xs text-muted-foreground">
          <li>CRAWL_ALERT_WEBHOOK_URL: <ConfigPill set={Boolean(process.env.CRAWL_ALERT_WEBHOOK_URL)} /></li>
          <li>GEMINI_API_KEY: <ConfigPill set={Boolean(process.env.GEMINI_API_KEY)} /> {process.env.GEMINI_API_KEY ? `(${process.env.GEMINI_API_KEY.split(",").filter(Boolean).length} key${process.env.GEMINI_API_KEY.split(",").filter(Boolean).length === 1 ? "" : "s"})` : ""}</li>
          <li>RESEND_API_KEY: <ConfigPill set={Boolean(process.env.RESEND_API_KEY)} /></li>
          <li>CRON_SECRET: <ConfigPill set={Boolean(process.env.CRON_SECRET)} /></li>
          <li>PARSE_BUDGET_PER_RUN: <span className="text-foreground tabular-nums">{process.env.PARSE_BUDGET_PER_RUN ?? "150 (default)"}</span></li>
        </ul>
      </section>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────

function Stat({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{sub}</p>
    </div>
  );
}

const STATUS_META: Record<CrawlRunStatus | "no_data", { label: string; tone: string; icon: React.ReactNode }> = {
  success: { label: "Healthy",  tone: "text-emerald-400", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  partial: { label: "Partial",  tone: "text-amber-400",   icon: <AlertCircle className="h-3.5 w-3.5" /> },
  failed:  { label: "Failed",   tone: "text-rose-400",    icon: <XCircle className="h-3.5 w-3.5" /> },
  running: { label: "Running",  tone: "text-sky-400",     icon: <Activity className="h-3.5 w-3.5" /> },
  no_data: { label: "No data",  tone: "text-muted-foreground", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

function CompanyHealthRow({ h }: {
  h: {
    company: { name: string; slug: string };
    latestStatus: CrawlRunStatus | "no_data";
    latestAt: string | null;
    twoInARow: boolean;
    runs: CrawlRunRow[];
    runsCount: number;
  };
}) {
  const meta = STATUS_META[h.latestStatus];
  const when = h.latestAt ? new Date(h.latestAt).toLocaleString() : "—";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{h.company.name}</span>
          <span className="text-xs text-muted-foreground">{h.company.slug}</span>
          {h.twoInARow && (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              DRIFT
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {h.runsCount} run{h.runsCount === 1 ? "" : "s"} in last 7d · latest {when}
        </p>
        {/* Mini timeline — last 7 statuses left→right oldest→newest */}
        <div className="mt-1.5 flex items-center gap-0.5">
          {[...h.runs].reverse().map((r, i) => (
            <span
              key={i}
              title={`${r.status} · ${new Date(r.started_at).toLocaleString()}${r.error ? ` · ${r.error}` : ""}`}
              className={`block h-2 w-4 rounded ${
                r.status === "success" ? "bg-emerald-500/70" :
                r.status === "partial" ? "bg-amber-500/70" :
                r.status === "failed"  ? "bg-rose-500/70" :
                                         "bg-sky-500/70"
              }`}
            />
          ))}
        </div>
      </div>
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-medium ${meta.tone}`}>
        {meta.icon}
        {meta.label}
      </div>
    </li>
  );
}

function ConfigPill({ set }: { set: boolean }) {
  return (
    <span className={`ml-1 inline-flex items-center gap-1 rounded-full border border-current/30 px-1.5 py-0.5 text-[10px] font-semibold ${set ? "text-emerald-400" : "text-rose-400"}`}>
      {set ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {set ? "set" : "unset"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase R4 — Resume Intelligence operational summary
// ─────────────────────────────────────────────────────────────────────────────

interface IntelEventRow {
  kind: string;
  scope: string;
  ok: boolean;
  latency_ms: number | null;
  created_at: string;
}

interface IntelSummaryProps {
  enhancedTotal: number;
  enhancedFinalised: number;
  enhancedPending: number;
  tailoredFinalised: number;
  events: IntelEventRow[];
}

function ResumeIntelSummary({
  enhancedTotal,
  enhancedFinalised,
  enhancedPending,
  tailoredFinalised,
  events,
}: IntelSummaryProps) {
  const diagnoses = events.filter((e) => e.kind === "diagnosis");
  const rewriteBatches = events.filter((e) => e.kind === "rewrite_batch");
  const renders = events.filter((e) => e.kind === "render_pdf");

  const diagOk = diagnoses.filter((e) => e.ok).length;
  const diagFail = diagnoses.filter((e) => !e.ok).length;
  const diagP50 = percentile(diagnoses.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.5);
  const diagP90 = percentile(diagnoses.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.9);

  const rewriteOk = rewriteBatches.filter((e) => e.ok).length;
  const rewriteFail = rewriteBatches.filter((e) => !e.ok).length;
  const rewriteP50 = percentile(rewriteBatches.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.5);

  return (
    <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enhanced</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">{enhancedFinalised}</p>
        <p className="text-[11px] text-muted-foreground">
          finalised · {enhancedPending} pending · {enhancedTotal} total
        </p>
      </div>
      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tailored</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">{tailoredFinalised}</p>
        <p className="text-[11px] text-muted-foreground">finalised (all-time)</p>
      </div>
      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Diagnoses 24h</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">
          {diagnoses.length}
          {diagFail > 0 && <span className="ml-2 text-xs font-semibold text-rose-400">{diagFail} fail</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">
          p50 {diagP50}ms · p90 {diagP90}ms · {diagOk} ok
        </p>
      </div>
      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rewrites 24h</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">
          {rewriteBatches.length}
          {rewriteFail > 0 && <span className="ml-2 text-xs font-semibold text-rose-400">{rewriteFail} fail</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">
          p50 {rewriteP50}ms · {rewriteOk} ok · {renders.length} renders
        </p>
      </div>
    </div>
  );
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return Math.round(sorted[idx]);
}
