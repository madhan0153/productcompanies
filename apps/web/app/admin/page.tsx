import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, FileText, ShieldAlert,
  Sparkles, Briefcase, Activity as ActivityIcon, Users as UsersIcon,
} from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";
import { scoreFleet, type CompanyRow, type CrawlRunRow } from "@/lib/admin/crawler-resilience";
import { qualityPulse } from "@/lib/admin/pulse";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { istHour } from "@/lib/util/ist";
import {
  Badge, Card, KPI, ListRow, SectionHeader, SevDot, Spark, StatusDot,
  type SevTone,
} from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const admin    = createSupabaseAdminClient();
  const now      = Date.now();
  const since24h = new Date(now - 24 * 3_600_000).toISOString();
  const since7d  = new Date(now - 7  * 24 * 3_600_000).toISOString();
  const since14d = new Date(now - 14 * 24 * 3_600_000).toISOString();

  const [
    profileMetrics,
    companiesResult,
    crawlerRunsResult,
    activeJobsResult,
    jobQualityResult,
    bgJobsResult,
    intelEventsResult,
    deadKeysResult,
    enhancedResult,
    tailoredResult,
  ] = await Promise.all([
    getProfileMetrics(admin, since24h, since7d),
    admin.from("companies").select("id, name, slug").order("name") as never,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false })
      .limit(500) as never,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("jobs")
      .select("quality_score")
      .eq("is_active", true)
      .not("quality_score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20) as never,
    admin
      .from("background_jobs")
      .select("id, job_type, status, queued_at, error_code, error_message")
      .order("queued_at", { ascending: false })
      .limit(50) as never,
    admin
      .from("resume_intel_events")
      .select("kind, ok, latency_ms, created_at")
      .gte("created_at", since7d)
      .limit(200) as never,
    admin.from("llm_dead_keys").select("provider_id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id",  { count: "exact", head: true }),
  ]);

  const companies   = ((companiesResult as { data: CompanyRow[] | null }).data   ?? []);
  const crawlerRuns = ((crawlerRunsResult as { data: CrawlRunRow[] | null }).data ?? []);

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of crawlerRuns) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }
  const fleet = scoreFleet(companies, runsByCompany);

  type BgJob      = { id: string; job_type: string; status: string; queued_at: string; error_code: string | null; error_message: string | null };
  type IntelEvent = { kind: string; ok: boolean; latency_ms: number | null };
  type QualityRow = { quality_score: number };

  const bgJobs       = ((bgJobsResult as { data: BgJob[] | null }).data        ?? []);
  const intelEvents  = ((intelEventsResult as { data: IntelEvent[] | null }).data  ?? []);
  const qualityRows  = ((jobQualityResult as { data: QualityRow[] | null }).data  ?? []);

  const activeQueue   = bgJobs.filter((j) => j.status === "queued" || j.status === "running").length;
  const parseAttempts = bgJobs.filter((j) => j.job_type === "resume_parse");
  const parseOk       = parseAttempts.filter((j) => j.status === "succeeded").length;
  const parseFailed   = parseAttempts.filter((j) => j.status === "failed").length;
  const parseRate     = parseAttempts.length === 0 ? 100 : Math.round((parseOk / parseAttempts.length) * 100);

  const intelOk       = intelEvents.filter((e) => e.ok).length;
  const intelRate     = intelEvents.length === 0 ? 100 : Math.round((intelOk / intelEvents.length) * 100);
  const avgLatency    = average(intelEvents.map((e) => e.latency_ms).filter((v): v is number => typeof v === "number"));

  const matchComputes = bgJobs.filter((j) => j.job_type === "match_compute").length;
  const failedBgJobs  = bgJobs.filter((j) => j.status === "failed").length;
  const runtime       = describeLlmRuntime();
  const aiArtifacts   = (enhancedResult.count ?? 0) + (tailoredResult.count ?? 0);
  // Real quality series only — never a fabricated trend (see lib/admin/pulse).
  const qualityData   = qualityPulse(qualityRows);

  // Attention items, ordered by severity
  type Attention = { id: string; title: string; detail: string; sev: SevTone; href: string };
  const attention: Attention[] = ([
    {
      id: "resume-failures",
      title:  parseFailed > 0 ? `${parseFailed} resume parse${parseFailed > 1 ? "s" : ""} failed` : "Resume parsing stable",
      detail: parseAttempts.length === 0
        ? "No recent parse attempts"
        : `${parseOk} succeeded · ${parseFailed} failed (${parseRate}% success)`,
      sev:    parseFailed > 0 ? "error" : "ok",
      href:   "/admin/resumes",
    },
    {
      id: "crawler-risk",
      title:  fleet.overall.companiesAtRisk > 0
        ? `${fleet.overall.companiesAtRisk} crawler source${fleet.overall.companiesAtRisk > 1 ? "s" : ""} at risk`
        : "Crawler fleet is healthy",
      detail: `${crawlerRuns.length} runs · ${companies.length} companies`,
      sev:    fleet.overall.companiesAtRisk > 0 ? "error" : "ok",
      href:   "/admin/crawler-intel",
    },
    {
      id: "llm-dead-keys",
      title:  (deadKeysResult.count ?? 0) > 0
        ? `${deadKeysResult.count} LLM key${(deadKeysResult.count ?? 0) > 1 ? "s" : ""} quarantined`
        : "No LLM dead keys",
      detail: `${runtime.providers.length} providers · ${runtime.operations.length} routed ops`,
      sev:    (deadKeysResult.count ?? 0) > 0 ? "warn" : "ok",
      href:   "/admin/ai-ops",
    },
    {
      id: "security-jobs",
      title:  failedBgJobs > 0
        ? `${failedBgJobs} background job${failedBgJobs > 1 ? "s" : ""} failed`
        : "Background jobs clear",
      detail: `${activeQueue} queued/running · ${matchComputes} match computes`,
      sev:    failedBgJobs > 0 ? "error" : activeQueue > 0 ? "warn" : "ok",
      href:   "/admin/security",
    },
    {
      id: "ai-pipeline",
      title:  intelRate < 90 ? `Resume intelligence at ${intelRate}% success` : "AI pipeline healthy",
      detail: `${intelEvents.length} events · ${avgLatency ? `${avgLatency}ms avg` : "no latency data"}`,
      sev:    intelRate < 90 ? "warn" : "ok",
      href:   "/admin/resumes",
    },
  ] satisfies Attention[]).sort((a, b) => sevRank(b.sev) - sevRank(a.sev));

  const greeting = greetingFor(new Date());
  const today    = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const liveJobs = activeJobsResult.count ?? 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      {/* Greeting */}
      <header style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          ProdMatch · Admin
        </p>
        <h1 style={{
          marginTop: 6, fontSize: 26, fontWeight: 600,
          letterSpacing: -0.8, color: "var(--text)",
        }}>
          {greeting} <span style={{ color: "var(--text-3)" }}>· {today}</span>
        </h1>
      </header>

      {/* KPI strip — 2x2 on mobile, 4x1 on desktop */}
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      }}>
        <KPI
          label="Total users"
          value={profileMetrics.totalUsers.toLocaleString("en-IN")}
          hint={`${profileMetrics.resumesUploaded7d} resumes this week`}
          accent
        />
        <KPI
          label="Live jobs"
          value={liveJobs.toLocaleString("en-IN")}
          hint={`${matchComputes} match runs`}
          live
        />
        <KPI
          label="Parse health"
          value={`${parseRate}%`}
          delta={parseFailed === 0 ? "+0 failures" : `−${parseFailed} failed`}
          hint={`${parseOk} ok`}
        />
        <KPI
          label="LLM routing"
          value={`${runtime.providers.length}/${runtime.presets.length}`}
          hint={`${runtime.providers.reduce((s, p) => s + p.keyCount, 0)} keys configured`}
        />
      </div>

      <SectionHeader
        title="Pulse"
        sub={qualityData.length > 0
          ? `Job quality across the last ${qualityData.length} jobs`
          : "Job quality — awaiting graded jobs"}
      />
      <Card p={18}>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4,
        }}>
          <div>
            <div className="pm-num" style={{
              fontSize: 30, fontWeight: 600, letterSpacing: -0.9, color: "var(--text)",
            }}>
              {liveJobs.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Live jobs across {companies.length} companies
            </div>
          </div>
          <Badge tone={fleet.overall.companiesAtRisk === 0 ? "ok" : "warn"}>
            Fleet {fleet.overall.fleetGrade} · {fleet.overall.fleetScore}
          </Badge>
        </div>
        {/* Real quality series only. When nothing is graded yet we show an
            honest note rather than a decorative placeholder trend line. */}
        {qualityData.length > 0 ? (
          <Spark data={qualityData} h={56} style={{ marginTop: 8 }} />
        ) : (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
            No quality-scored jobs yet — this trend appears once the crawler grades active jobs.
          </div>
        )}
      </Card>

      {/* Two-column: Needs attention + Quick stats */}
      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
      }}>
        <Card p={0}>
          <SectionHeader title="Needs attention" sub="Sorted by severity" />
          <div style={{ paddingBottom: 4 }}>
            {attention.map((a, i) => (
              <ListRow
                key={a.id}
                href={a.href}
                divider={i < attention.length - 1}
                leading={<SevDot sev={a.sev} />}
                title={a.title}
                subtitle={a.detail}
                trailing={
                  <Badge tone={sevBadgeTone(a.sev)}>
                    {a.sev === "ok" ? "healthy" : a.sev === "warn" ? "watch" : "act"}
                  </Badge>
                }
              />
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Briefcase size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Crawler fleet</span>
              <span style={{ marginLeft: "auto" }}>
                <StatusDot live={fleet.overall.companiesAtRisk === 0} tone={fleet.overall.companiesAtRisk === 0 ? "ok" : "warn"} />
              </span>
            </div>
            <div className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
              {fleet.overall.fleetGrade}
              <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: 8, fontSize: 14 }}>
                · {fleet.overall.fleetScore}/100
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              {fleet.overall.companiesAtRisk} at risk · {crawlerRuns.length} runs (14d)
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <ActivityIcon size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>AI pipeline</span>
            </div>
            <div className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
              {intelRate}<span style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 500 }}>%</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              {intelEvents.length} events · {avgLatency ? `${avgLatency}ms avg` : "no latency data"}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>AI artifacts</span>
            </div>
            <div className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
              {aiArtifacts.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              Enhanced + tailored resumes shipped
            </div>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}>
        <ActionTile href="/admin/users"          icon={<UsersIcon size={16} style={{ color: "var(--accent)" }} />}    title="Users"       desc="Search, suspend, inspect profiles." />
        <ActionTile href="/admin/billing"        icon={<Sparkles size={16} style={{ color: "var(--accent)" }} />}     title="Billing"     desc="Grants, coupons, subscriptions." />
        <ActionTile href="/admin/resumes"        icon={<FileText size={16} style={{ color: "var(--accent)" }} />}     title="Resumes"     desc="Parse health and reparse." />
        <ActionTile href="/admin/security"       icon={<ShieldAlert size={16} style={{ color: "var(--accent)" }} />}  title="Security"    desc="Background jobs, failures." />
        <ActionTile href="/admin/ops"            icon={<AlertTriangle size={16} style={{ color: "var(--accent)" }} />} title="Ops"        desc="Triggers, dead keys, cron." />
      </div>
    </div>
  );
}

// ─── small server-only components ────────────────────────────────────────────

function ActionTile({
  href, icon, title, desc,
}: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} style={{ display: "block" }}>
      <Card p={16} style={{ transition: "transform .12s, box-shadow .12s" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--accent-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 10,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{desc}</div>
        <div style={{
          marginTop: 10, fontSize: 12, fontWeight: 500,
          color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          Open <ArrowUpRight size={12} />
        </div>
      </Card>
    </Link>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProfileMetrics(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  since24h: string,
  since7d: string,
) {
  const [total, errors, today, week] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_parse_error", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since24h).not("resume_storage_path", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since7d).not("resume_storage_path", "is", null),
  ]);
  return {
    totalUsers:           total.count   ?? 0,
    parseErrors:          errors.count  ?? 0,
    resumesUploadedToday: today.count   ?? 0,
    resumesUploaded7d:    week.count    ?? 0,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function sevRank(sev: SevTone): number {
  if (sev === "error") return 3;
  if (sev === "warn")  return 2;
  if (sev === "ok")    return 1;
  return 0;
}

function sevBadgeTone(sev: SevTone): "ok" | "warn" | "err" | "info" {
  if (sev === "error") return "err";
  if (sev === "warn")  return "warn";
  if (sev === "ok")    return "ok";
  return "info";
}

function greetingFor(d: Date): string {
  const h = istHour(d);
  if (h < 5)  return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
