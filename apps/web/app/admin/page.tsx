import type { Metadata } from "next";
import { describeLlmRuntime } from "@prodmatch/shared";
import { scoreFleet, type CompanyRow, type CrawlRunRow } from "@/lib/admin/crawler-resilience";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminControlRoom, type AdminDashboardData } from "@/components/admin/admin-control-room";
import type { State } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin | Command Center" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const admin  = createSupabaseAdminClient();
  const now    = Date.now();
  const since24h = new Date(now - 24 * 3_600_000).toISOString();
  const since7d  = new Date(now - 7 * 24 * 3_600_000).toISOString();
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
    admin.from("companies").select("id, name, slug").order("name") as any,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false })
      .limit(500) as any,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("jobs")
      .select("quality_score")
      .eq("is_active", true)
      .not("quality_score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20) as any,
    admin
      .from("background_jobs")
      .select("id, job_type, status, queued_at, error_code, error_message")
      .order("queued_at", { ascending: false })
      .limit(50) as any,
    admin
      .from("resume_intel_events")
      .select("kind, ok, latency_ms, created_at")
      .gte("created_at", since7d)
      .limit(200) as any,
    admin
      .from("llm_dead_keys")
      .select("provider_id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id",  { count: "exact", head: true }),
  ]);

  const companies   = (companiesResult.data   ?? []) as CompanyRow[];
  const crawlerRuns = (crawlerRunsResult.data ?? []) as CrawlRunRow[];

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of crawlerRuns) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }
  const fleet = scoreFleet(companies, runsByCompany);

  type BgJob = { id: string; job_type: string; status: string; queued_at: string; error_code: string | null; error_message: string | null };
  type IntelEvent = { kind: string; ok: boolean; latency_ms: number | null };
  type QualityRow = { quality_score: number };

  const bgJobs        = (bgJobsResult.data    ?? []) as BgJob[];
  const intelEvents   = (intelEventsResult.data ?? []) as IntelEvent[];
  const qualityRows   = (jobQualityResult.data ?? []) as QualityRow[];

  const activeQueue    = bgJobs.filter((j) => j.status === "queued" || j.status === "running").length;
  const parseAttempts  = bgJobs.filter((j) => j.job_type === "resume_parse");
  const parseOk        = parseAttempts.filter((j) => j.status === "succeeded").length;
  const parseFailed    = parseAttempts.filter((j) => j.status === "failed").length;
  const parseRate      = parseAttempts.length === 0 ? 100 : Math.round((parseOk / parseAttempts.length) * 100);

  const intelOk        = intelEvents.filter((e) => e.ok).length;
  const intelRate      = intelEvents.length === 0 ? 100 : Math.round((intelOk / intelEvents.length) * 100);
  const avgLatency     = average(intelEvents.map((e) => e.latency_ms).filter((v): v is number => typeof v === "number"));

  const matchComputes  = bgJobs.filter((j) => j.job_type === "match_compute").length;
  const failedBgJobs   = bgJobs.filter((j) => j.status === "failed").length;
  const runtime        = describeLlmRuntime();
  const aiArtifacts    = (enhancedResult.count ?? 0) + (tailoredResult.count ?? 0);

  // Build attention items (serialisable — icons looked up client-side by id)
  type AttentionItem = AdminDashboardData["attention"][number];
  const attention: AttentionItem[] = [
    {
      id:     "resume-failures",
      title:  parseFailed > 0 ? `${parseFailed} resume parse${parseFailed > 1 ? "s" : ""} failed` : "Resume parsing stable",
      detail: parseAttempts.length === 0
        ? "No recent parse attempts"
        : `${parseOk} succeeded · ${parseFailed} failed (${parseRate}% success)`,
      tone:   (parseFailed > 0 ? "danger" : "ok") as State,
      href:   "/admin/resumes",
    },
    {
      id:     "crawler-risk",
      title:  fleet.overall.companiesAtRisk > 0
        ? `${fleet.overall.companiesAtRisk} crawler source${fleet.overall.companiesAtRisk > 1 ? "s" : ""} at risk`
        : "Crawler fleet is healthy",
      detail: `${crawlerRuns.length} runs · ${companies.length} companies`,
      tone:   (fleet.overall.companiesAtRisk > 0 ? "danger" : "ok") as State,
      href:   "/admin/crawler-intel",
    },
    {
      id:     "llm-dead-keys",
      title:  (deadKeysResult.count ?? 0) > 0
        ? `${deadKeysResult.count} LLM key${(deadKeysResult.count ?? 0) > 1 ? "s" : ""} quarantined`
        : "No LLM dead keys",
      detail: `${runtime.providers.length} providers · ${runtime.operations.length} routed ops`,
      tone:   ((deadKeysResult.count ?? 0) > 0 ? "warn" : "ok") as State,
      href:   "/admin/ai-ops",
    },
    {
      id:     "security-jobs",
      title:  failedBgJobs > 0
        ? `${failedBgJobs} background job${failedBgJobs > 1 ? "s" : ""} failed`
        : "Background jobs clear",
      detail: `${activeQueue} queued/running · ${matchComputes} match computes`,
      tone:   (failedBgJobs > 0 ? "danger" : activeQueue > 0 ? "warn" : "ok") as State,
      href:   "/admin/security",
    },
    {
      id:     "ai-pipeline",
      title:  intelRate < 90
        ? `Resume intelligence at ${intelRate}% success`
        : "AI pipeline healthy",
      detail: `${intelEvents.length} events · ${avgLatency ? `${avgLatency}ms avg` : "no latency data"}`,
      tone:   (intelRate < 90 ? "warn" : "ok") as State,
      href:   "/admin/resumes",
    },
  ].sort((a, b) => severityRank(b.tone) - severityRank(a.tone));

  const data: AdminDashboardData = {
    generatedAt:    new Date().toISOString(),
    fleetGrade:     fleet.overall.fleetGrade,
    fleetScore:     fleet.overall.fleetScore,
    activeQueue,
    atRiskCompanies: fleet.overall.companiesAtRisk,

    metrics: [
      {
        id:     "users",
        label:  "Users",
        value:  String(profileMetrics.totalUsers),
        detail: `${profileMetrics.resumesUploadedToday} resumes today`,
        trend:  `${profileMetrics.resumesUploaded7d} uploads this week`,
        tone:   "blue",
      },
      {
        id:     "resumes",
        label:  "Parse health",
        value:  `${parseRate}%`,
        detail: `${parseOk} ok · ${parseFailed} failed`,
        tone:   parseRate >= 90 ? "green" : "amber",
        trend:  `${profileMetrics.parseErrors} active errors`,
      },
      {
        id:     "jobs",
        label:  "Live jobs",
        value:  String(activeJobsResult.count ?? 0),
        detail: `${aiArtifacts} AI artifacts`,
        tone:   "violet",
        trend:  `${matchComputes} match runs`,
      },
      {
        id:     "llm",
        label:  "LLM routing",
        value:  `${runtime.providers.length}/${runtime.presets.length}`,
        detail: `${runtime.providers.reduce((s, p) => s + p.keyCount, 0)} keys`,
        tone:   "green",
        trend:  `${runtime.operations.filter((o) => o.externalFallback === "allowed").length} fallback-ready`,
      },
    ],

    health: [
      {
        label:  "Crawler fleet",
        value:  `${fleet.overall.fleetGrade} / ${fleet.overall.fleetScore}`,
        detail: `${fleet.overall.companiesAtRisk} at risk`,
        state:  fleet.overall.companiesAtRisk === 0 ? "ok" : "warn",
      },
      {
        label:  "AI pipeline",
        value:  `${intelRate}% ok`,
        detail: `${intelEvents.length} events · ${avgLatency ? `${avgLatency}ms avg` : "no data"}`,
        state:  intelRate >= 90 ? "ok" : "warn",
      },
      {
        label:  "Queue pressure",
        value:  String(activeQueue),
        detail: `${failedBgJobs} failed jobs`,
        state:  failedBgJobs > 0 ? "warn" : "ok",
      },
    ],

    attention,

    jobQualityPulse: qualityRows.map((r) => Math.round(r.quality_score)),

    quickStats: {
      totalUsers:   profileMetrics.totalUsers,
      liveJobs:     activeJobsResult.count ?? 0,
      aiArtifacts,
      crawlerRuns:  crawlerRuns.length,
    },
  };

  return <AdminControlRoom data={data} />;
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

function severityRank(tone: string): number {
  if (tone === "danger") return 3;
  if (tone === "warn")   return 2;
  if (tone === "ok")     return 1;
  return 0;
}
