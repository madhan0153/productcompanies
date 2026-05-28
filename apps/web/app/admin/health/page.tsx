// Live operator view: crawler status, catalog volume, user engagement.
// PM-tokens version.

import type { Metadata } from "next";
import { Activity, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, SectionHeader } from "@/components/admin/pm";

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

interface IntelEventRow {
  kind: string;
  scope: string;
  ok: boolean;
  latency_ms: number | null;
  created_at: string;
}

export default async function AdminHealthPage() {
  const admin    = createSupabaseAdminClient();
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
    { count: enhancedTotal },
    { count: enhancedFinalised },
    { count: enhancedPending },
    { count: tailoredFinalised },
    intelEventsRecent,
  ] = await Promise.all([
    admin.from("companies").select("id, name, slug").order("name") as never,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since7d)
      .order("started_at", { ascending: false }) as never,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).not("jd_parsed_at", "is", null),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).is("jd_parsed_at", null),
    admin
      .from("jobs")
      .select("apply_click_count")
      .eq("is_active", true)
      .gt("apply_click_count", 0)
      .order("apply_click_count", { ascending: false })
      .limit(500) as never,
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_storage_path", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("last_match_compute_at", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_match_compute_at", since24h),
    admin.from("matches").select("user_id", { count: "exact", head: true }),
    admin.from("matches").select("user_id", { count: "exact", head: true }).is("seen_at", null),
    admin.from("matches").select("user_id", { count: "exact", head: true }).eq("user_hidden", true),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),
    admin
      .from("resume_intel_events")
      .select("kind, scope, ok, latency_ms, created_at")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1000) as never,
  ]);

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of ((recentRuns as CrawlRunRow[] | null) ?? [])) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }

  type CompanyHealth = {
    company: CompanyRow;
    latestStatus: CrawlRunStatus | "no_data";
    latestAt: string | null;
    twoInARow: boolean;
    runs: CrawlRunRow[];
    runsCount: number;
  };

  const companyHealth: CompanyHealth[] = (((companies as CompanyRow[] | null) ?? [])).map((co) => {
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
    const rank = (s: CompanyHealth) =>
      s.twoInARow ? 0 : s.latestStatus === "failed" ? 1 : s.latestStatus === "partial" ? 2 : s.latestStatus === "no_data" ? 3 : 4;
    return rank(a) - rank(b);
  });

  const applyClicks = ((applyClickSummary as Array<{ apply_click_count: number }> | null) ?? []);
  const totalClicks = applyClicks.reduce((s, x) => s + (x.apply_click_count ?? 0), 0);
  const distinctClickedJobs = applyClicks.length;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Health
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Operations
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Live operator view. Refreshed {new Date().toLocaleTimeString("en-IN")}.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Active jobs"    value={String(activeJobCount ?? 0)}       hint={`${parsedJobCount ?? 0} parsed · ${unparsedJobCount ?? 0} pending`} accent />
        <KPI label="Users"          value={String(userCount ?? 0)}            hint={`${usersWithResume ?? 0} resumes · ${usersWithMatches ?? 0} matched`} />
        <KPI label="Computed 24h"   value={String(usersComputedLast24h ?? 0)} hint="last_match_compute_at" />
        <KPI label="Match rows"     value={String(matchesTotal ?? 0)}         hint={`${matchesUnseen ?? 0} unseen · ${matchesHidden ?? 0} dismissed`} />
      </div>

      <SectionHeader title="Apply intent" sub="Aggregate apply-button clicks across active roles" />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="pm-num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
              {totalClicks.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>total clicks</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="pm-num" style={{ fontSize: 18, fontWeight: 600 }}>{distinctClickedJobs}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>roles received clicks</div>
          </div>
        </div>
      </Card>

      <SectionHeader
        title="Crawler health"
        sub={`Last 7 days · ${(recentRuns as CrawlRunRow[] | null)?.length ?? 0} runs`}
      />
      <Card p={0}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {companyHealth.map((h, i) => (
            <CompanyHealthRow key={h.company.id} h={h} divider={i < companyHealth.length - 1} />
          ))}
        </ul>
      </Card>

      <SectionHeader title="Resume Intelligence" sub="Enhanced + Tailored pipeline · 24h" />
      <ResumeIntelSummary
        enhancedTotal={enhancedTotal ?? 0}
        enhancedFinalised={enhancedFinalised ?? 0}
        enhancedPending={enhancedPending ?? 0}
        tailoredFinalised={tailoredFinalised ?? 0}
        events={((intelEventsRecent as { data: IntelEventRow[] | null }).data) ?? []}
      />

      <SectionHeader title="Configuration" />
      <Card>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
          <ConfigLine name="CRAWL_ALERT_WEBHOOK_URL" set={Boolean(process.env.CRAWL_ALERT_WEBHOOK_URL)} />
          <ConfigLine
            name="GEMINI_API_KEY"
            set={Boolean(process.env.GEMINI_API_KEY)}
            tail={process.env.GEMINI_API_KEY
              ? `(${process.env.GEMINI_API_KEY.split(",").filter(Boolean).length} key${process.env.GEMINI_API_KEY.split(",").filter(Boolean).length === 1 ? "" : "s"})`
              : ""}
          />
          <ConfigLine name="RESEND_API_KEY" set={Boolean(process.env.RESEND_API_KEY)} />
          <ConfigLine name="CRON_SECRET"    set={Boolean(process.env.CRON_SECRET)} />
          <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ fontFamily: "var(--font-mono)" }}>PARSE_BUDGET_PER_RUN:</code>
            <span className="pm-num" style={{ color: "var(--text)", fontWeight: 500 }}>
              {process.env.PARSE_BUDGET_PER_RUN ?? "150 (default)"}
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

const STATUS_META: Record<CrawlRunStatus | "no_data", { label: string; tone: "ok" | "warn" | "err" | "info" | "neutral"; icon: React.ReactNode }> = {
  success: { label: "Healthy", tone: "ok",      icon: <CheckCircle2 size={12} /> },
  partial: { label: "Partial", tone: "warn",    icon: <AlertCircle  size={12} /> },
  failed:  { label: "Failed",  tone: "err",     icon: <XCircle      size={12} /> },
  running: { label: "Running", tone: "info",    icon: <Activity     size={12} /> },
  no_data: { label: "No data", tone: "neutral", icon: <AlertCircle  size={12} /> },
};

function CompanyHealthRow({
  h, divider,
}: {
  h: {
    company: { name: string; slug: string };
    latestStatus: CrawlRunStatus | "no_data";
    latestAt: string | null;
    twoInARow: boolean;
    runs: CrawlRunRow[];
    runsCount: number;
  };
  divider: boolean;
}) {
  const meta = STATUS_META[h.latestStatus];
  const when = h.latestAt ? new Date(h.latestAt).toLocaleString("en-IN") : "—";
  return (
    <li style={{
      padding: "12px 16px",
      borderBottom: divider ? "1px solid var(--line-2)" : "none",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{h.company.name}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{h.company.slug}</span>
          {h.twoInARow && <Badge tone="err" size="sm">DRIFT</Badge>}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
          {h.runsCount} run{h.runsCount === 1 ? "" : "s"} in 7d · latest {when}
        </p>
        <div style={{ marginTop: 6, display: "flex", gap: 2 }}>
          {[...h.runs].reverse().map((r, i) => (
            <span
              key={i}
              title={`${r.status} · ${new Date(r.started_at).toLocaleString()}${r.error ? ` · ${r.error}` : ""}`}
              style={{
                display: "block", height: 8, width: 18, borderRadius: 2,
                background:
                  r.status === "success" ? "var(--ok)" :
                  r.status === "partial" ? "var(--warn)" :
                  r.status === "failed"  ? "var(--err)" :
                                           "var(--accent)",
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </div>
      <Badge tone={meta.tone}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{meta.icon} {meta.label}</span>
      </Badge>
    </li>
  );
}

function ConfigLine({ name, set, tail }: { name: string; set: boolean; tail?: string }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <code style={{ fontFamily: "var(--font-mono)" }}>{name}:</code>
      <Badge tone={set ? "ok" : "err"} size="sm">{set ? "set" : "unset"}</Badge>
      {tail && <span style={{ color: "var(--text-3)" }}>{tail}</span>}
    </li>
  );
}

function ResumeIntelSummary({
  enhancedTotal, enhancedFinalised, enhancedPending, tailoredFinalised, events,
}: {
  enhancedTotal: number; enhancedFinalised: number; enhancedPending: number;
  tailoredFinalised: number; events: IntelEventRow[];
}) {
  const diagnoses      = events.filter((e) => e.kind === "diagnosis");
  const rewriteBatches = events.filter((e) => e.kind === "rewrite_batch");
  const renders        = events.filter((e) => e.kind === "render_pdf");

  const diagOk   = diagnoses.filter((e) => e.ok).length;
  const diagFail = diagnoses.filter((e) => !e.ok).length;
  const diagP50  = percentile(diagnoses.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.5);
  const diagP90  = percentile(diagnoses.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.9);

  const rewriteOk   = rewriteBatches.filter((e) => e.ok).length;
  const rewriteFail = rewriteBatches.filter((e) => !e.ok).length;
  const rewriteP50  = percentile(rewriteBatches.map((e) => e.latency_ms ?? 0).filter((n) => n > 0), 0.5);

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <IntelTile label="Enhanced" value={enhancedFinalised} sub={`finalised · ${enhancedPending} pending · ${enhancedTotal} total`} />
      <IntelTile label="Tailored" value={tailoredFinalised} sub="finalised (all-time)" />
      <IntelTile
        label="Diagnoses 24h"
        value={diagnoses.length}
        tail={diagFail > 0 ? <span style={{ color: "var(--err)", fontSize: 11, marginLeft: 6, fontWeight: 600 }}>{diagFail} fail</span> : null}
        sub={`p50 ${diagP50}ms · p90 ${diagP90}ms · ${diagOk} ok`}
      />
      <IntelTile
        label="Rewrites 24h"
        value={rewriteBatches.length}
        tail={rewriteFail > 0 ? <span style={{ color: "var(--err)", fontSize: 11, marginLeft: 6, fontWeight: 600 }}>{rewriteFail} fail</span> : null}
        sub={`p50 ${rewriteP50}ms · ${rewriteOk} ok · ${renders.length} renders`}
      />
    </div>
  );
}

function IntelTile({
  label, value, sub, tail,
}: { label: string; value: number; sub: string; tail?: React.ReactNode }) {
  return (
    <Card p={14}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
        {label}
      </p>
      <p style={{ marginTop: 4, display: "flex", alignItems: "baseline" }}>
        <span className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>{value.toLocaleString("en-IN")}</span>
        {tail}
      </p>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub}</p>
    </Card>
  );
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return Math.round(sorted[idx]);
}
