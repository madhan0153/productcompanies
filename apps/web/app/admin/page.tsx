import type { Metadata } from "next";
import { describeLlmRuntime, getDsaRoleStats } from "@prodmatch/shared";
import { scoreFleet, type CompanyRow, type CrawlRunRow } from "@/lib/admin/crawler-resilience";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminControlRoom, type AdminControlRoomData } from "@/components/admin/admin-control-room";

export const metadata: Metadata = { title: "Admin | Control Room" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = {
  q?: string;
  job?: string;
};

type AdminPageProps = {
  searchParams?: Promise<SearchParams>;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  current_role: string | null;
  job_title: string | null;
  role_function: string | null;
  target_role_functions: string[] | null;
  resume_storage_path: string | null;
  resume_parsed: unknown | null;
  resume_parsing_at: string | null;
  resume_parse_error: string | null;
  resume_score: number | null;
  product_dna_score: number | null;
  last_match_compute_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  banned_until?: string;
};

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  is_active: boolean;
  quality_score: number | null;
  quality_reasons: string[] | null;
  jd_parsed_at: string | null;
  is_likely_ghost: boolean;
  apply_click_count: number | null;
  role_function_jd: string | null;
  last_seen_at: string | null;
  updated_at: string;
  companies: { name: string; slug: string } | null;
};

type MatchRow = {
  user_id: string;
  job_id: string;
  score: number;
  confidence: number | null;
  verdict: string | null;
  computed_at: string;
  user_hidden: boolean | null;
  jobs: { title: string; companies: { name: string } | null } | null;
};

type ResumeIntelEvent = {
  kind: string;
  scope: string;
  ok: boolean;
  error_kind: string | null;
  latency_ms: number | null;
  created_at: string;
};

type BackgroundJob = {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  finished_at: string | null;
};

type DpdpEvent = {
  event: string;
  user_id: string | null;
  created_at: string;
  metadata: unknown;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = (await searchParams) ?? {};
  const userQuery = cleanParam(params.q);
  const jobQuery = cleanParam(params.job);

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const since24h = new Date(now - 24 * 3_600_000).toISOString();
  const since7d = new Date(now - 7 * 24 * 3_600_000).toISOString();
  const since14d = new Date(now - 14 * 24 * 3_600_000).toISOString();

  const [
    authUsersResult,
    profilesResult,
    companiesResult,
    crawlerRunsResult,
    activeJobsResult,
    jobsResult,
    matchesResult,
    profileMetrics,
    backgroundJobsResult,
    intelEventsResult,
    deadKeysResult,
    resumeVersionsResult,
    enhancedResult,
    tailoredResult,
    dispatchResult,
    dpdpResult,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 80 }),
    (admin
      .from("profiles")
      .select("id, display_name, current_role, job_title, role_function, target_role_functions, resume_storage_path, resume_parsed, resume_parsing_at, resume_parse_error, resume_score, product_dna_score, last_match_compute_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500) as any),
    (admin.from("companies").select("id, name, slug, logo_url").order("name") as any),
    (admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false })
      .limit(1000) as any),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    buildJobsQuery(admin, jobQuery),
    (admin
      .from("matches")
      .select("user_id, job_id, score, confidence, verdict, computed_at, user_hidden, jobs(title, companies(name))")
      .order("computed_at", { ascending: false })
      .limit(14) as any),
    getProfileMetrics(admin, since24h, since7d),
    (admin
      .from("background_jobs")
      .select("id, user_id, job_type, status, error_code, error_message, queued_at, finished_at")
      .order("queued_at", { ascending: false })
      .limit(24) as any),
    (admin
      .from("resume_intel_events")
      .select("kind, scope, ok, error_kind, latency_ms, created_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(500) as any),
    (admin
      .from("llm_dead_keys")
      .select("provider_id, model, capability, failure_kind, dead_until, detected_at")
      .order("detected_at", { ascending: false })
      .limit(20) as any),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("interview_daily_dispatch").select("problem_slug", { count: "exact", head: true }),
    (admin
      .from("dpdp_events")
      .select("event, user_id, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(12) as any),
  ]);

  const authUsers = (authUsersResult.data?.users ?? []) as AuthUser[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const users = filterUsers(authUsers, profileById, userQuery);
  const companies = (companiesResult.data ?? []) as Array<CompanyRow & { logo_url: string | null }>;
  const crawlerRuns = (crawlerRunsResult.data ?? []) as CrawlRunRow[];
  const jobs = (jobsResult.data ?? []) as JobRow[];
  const matches = (matchesResult.data ?? []) as MatchRow[];
  const backgroundJobs = (backgroundJobsResult.data ?? []) as BackgroundJob[];
  const intelEvents = (intelEventsResult.data ?? []) as ResumeIntelEvent[];
  const dpdpEvents = (dpdpResult.data ?? []) as DpdpEvent[];
  const runtime = describeLlmRuntime();

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const run of crawlerRuns) {
    if (!runsByCompany.has(run.company_id)) runsByCompany.set(run.company_id, []);
    runsByCompany.get(run.company_id)!.push(run);
  }
  const fleet = scoreFleet(companies, runsByCompany);
  const parseAttempts = backgroundJobs.filter((job) => job.job_type === "resume_parse");
  const parseSucceeded = parseAttempts.filter((job) => job.status === "succeeded").length;
  const parseFailed = parseAttempts.filter((job) => job.status === "failed").length;
  const parseSuccessRate = parseAttempts.length === 0 ? 100 : Math.round((parseSucceeded / parseAttempts.length) * 100);
  const intelOk = intelEvents.filter((event) => event.ok).length;
  const intelSuccessRate = intelEvents.length === 0 ? 100 : Math.round((intelOk / intelEvents.length) * 100);
  const avgLatency = average(intelEvents.map((event) => event.latency_ms).filter((value): value is number => typeof value === "number"));
  const activeQueue = backgroundJobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const matchComputes24h = backgroundJobs.filter((job) => job.job_type === "match_compute" && new Date(job.queued_at).getTime() >= new Date(since24h).getTime()).length;
  const aiResumeArtifacts = (enhancedResult.count ?? 0) + (tailoredResult.count ?? 0);
  const topSkills = topValues(profiles.flatMap((profile) => extractStringArray(profile.resume_parsed, "tech_stack")), 8);
  const roleMix = topValues(profiles.map((profile) => profile.role_function).filter(Boolean) as string[], 8);
  const dsaStats = getDsaRoleStats();

  const data: AdminControlRoomData = {
    filters: { userQuery, jobQuery },
    hero: {
      generatedAt: new Date().toISOString(),
      fleetGrade: fleet.overall.fleetGrade,
      fleetScore: fleet.overall.fleetScore,
      activeQueue,
      atRiskCompanies: fleet.overall.companiesAtRisk,
    },
    metrics: [
      {
        id: "users",
        label: "Users",
        value: String(profileMetrics.totalUsers),
        detail: `${profileMetrics.resumesUploadedToday} resumes today`,
        tone: "blue",
        trend: `${profileMetrics.resumesUploaded7d} uploads this week`,
      },
      {
        id: "resumes",
        label: "Parse health",
        value: `${parseSuccessRate}%`,
        detail: `${parseSucceeded} ok, ${parseFailed} failed`,
        tone: parseSuccessRate >= 90 ? "green" : "amber",
        trend: `${profileMetrics.parseErrors} active parse errors`,
      },
      {
        id: "jobs",
        label: "Live jobs",
        value: String(activeJobsResult.count ?? 0),
        detail: `${jobs.filter((job) => job.jd_parsed_at).length} visible rows parsed`,
        tone: "violet",
        trend: `${jobs.filter((job) => job.is_likely_ghost).length} ghost flags`,
      },
      {
        id: "llm",
        label: "LLM routing",
        value: `${runtime.providers.length}/${runtime.presets.length}`,
        detail: `${runtime.providers.reduce((sum, provider) => sum + provider.keyCount, 0)} external keys`,
        tone: "green",
        trend: `${runtime.operations.filter((op) => op.externalFallback === "allowed").length} fallback-ready ops`,
      },
    ],
    health: [
      {
        label: "Crawler fleet",
        value: `${fleet.overall.fleetGrade} / ${fleet.overall.fleetScore}`,
        detail: `${fleet.overall.companiesAtRisk} companies at risk`,
        state: fleet.overall.companiesAtRisk === 0 ? "ok" : "warn",
      },
      {
        label: "Resume intelligence",
        value: `${intelSuccessRate}% ok`,
        detail: `${intelEvents.length} events, ${avgLatency ? `${avgLatency}ms avg` : "no latency"}`,
        state: intelSuccessRate >= 90 ? "ok" : "warn",
      },
      {
        label: "Queue pressure",
        value: String(activeQueue),
        detail: `${matchComputes24h} match jobs in 24h`,
        state: backgroundJobs.some((job) => job.status === "failed") ? "warn" : "ok",
      },
    ],
    users: users.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? user.id,
        name: profile?.display_name ?? null,
        role: profile?.role_function ?? profile?.current_role ?? profile?.job_title ?? "Unknown",
        targetRoles: profile?.target_role_functions ?? [],
        joinedAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        suspended: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now()),
        hasResume: Boolean(profile?.resume_storage_path),
        resumeState: profile?.resume_parse_error ? "failed" : profile?.resume_parsing_at ? "parsing" : profile?.resume_parsed ? "parsed" : "missing",
        resumeScore: profile?.resume_score ?? profile?.product_dna_score ?? null,
        lastMatchComputeAt: profile?.last_match_compute_at ?? null,
      };
    }),
    resumes: profiles
      .filter((profile) => profile.resume_storage_path)
      .slice(0, 14)
      .map((profile) => ({
        id: profile.id,
        candidate: profile.display_name ?? profile.id.slice(0, 8),
        role: profile.current_role ?? profile.job_title ?? "No headline",
        score: profile.resume_score ?? profile.product_dna_score ?? null,
        state: profile.resume_parse_error ? "failed" : profile.resume_parsing_at ? "parsing" : "ready",
        updatedAt: profile.updated_at,
        error: profile.resume_parse_error,
      })),
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.companies?.name ?? "Unknown",
      companySlug: job.companies?.slug ?? null,
      location: job.location ?? "Location n/a",
      active: job.is_active,
      quality: Math.round(job.quality_score ?? 100),
      parsed: Boolean(job.jd_parsed_at),
      ghost: job.is_likely_ghost,
      applyClicks: job.apply_click_count ?? 0,
      role: job.role_function_jd ?? "unclassified",
      lastSeenAt: job.last_seen_at,
    })),
    matches: matches.map((match) => ({
      id: `${match.user_id}-${match.job_id}`,
      role: match.jobs?.title ?? match.job_id.slice(0, 8),
      company: match.jobs?.companies?.name ?? "Unknown",
      score: Math.round(match.score),
      confidence: match.confidence == null ? null : Math.round(match.confidence),
      verdict: match.verdict ?? "scored",
      computedAt: match.computed_at,
      hidden: Boolean(match.user_hidden),
    })),
    crawler: {
      companies: companies.length,
      runs: crawlerRuns.length,
      atRisk: fleet.overall.companiesAtRisk,
      rows: fleet.perCompany.slice(0, 14).map((company) => {
        const latest = company.runs[0];
        return {
          slug: company.company.slug,
          name: company.company.name,
          status: company.latestStatus,
          score: company.score,
          lastRunAt: company.latestAt ?? null,
          jobsNew: latest?.jobs_new ?? 0,
          jobsUpdated: latest?.jobs_updated ?? 0,
          action: company.driftFlag
            ? "Inspect selector drift"
            : company.staleFlag
              ? "Trigger fresh crawl"
              : company.score < 70
                ? "Review crawler coverage"
                : "Monitor",
        };
      }),
    },
    llm: {
      providers: runtime.providers.map((provider) => ({
        id: provider.id,
        label: provider.label,
        keys: provider.keyCount,
        supportsPdf: provider.supportsPdf,
        models: provider.textModels.slice(0, 3),
      })),
      operations: runtime.operations.map((operation) => ({
        id: operation.id,
        label: operation.label,
        capability: operation.capability,
        fallback: operation.externalFallback,
        deterministic: operation.deterministicFallback,
      })),
      deadKeys: ((deadKeysResult.data ?? []) as Array<{ provider_id: string; model: string; capability: string; failure_kind: string; dead_until: string; detected_at: string }>).map((key) => ({
        provider: key.provider_id,
        model: key.model,
        capability: key.capability,
        failure: key.failure_kind,
        deadUntil: key.dead_until,
        detectedAt: key.detected_at,
      })),
    },
    analytics: {
      topSkills,
      roleMix,
      resumeArtifacts: aiResumeArtifacts,
      snapshots: resumeVersionsResult.count ?? 0,
    },
    content: {
      dsaProblems: dsaStats.reduce((sum, track) => sum + track.problemCount, 0),
      dispatches: dispatchResult.count ?? 0,
      tracks: dsaStats.map((track) => ({
        role: track.role,
        label: track.label,
        problems: track.problemCount,
        easy: track.easy,
        medium: track.medium,
        hard: track.hard,
        concepts: track.concepts.slice(0, 4),
      })),
    },
    settings: [
      {
        key: "ADMIN_EMAILS",
        enabled: Boolean(process.env.ADMIN_EMAILS),
        detail: process.env.ADMIN_EMAILS ? `${process.env.ADMIN_EMAILS.split(",").filter(Boolean).length} admins` : "Unset",
      },
      { key: "CRON_SECRET", enabled: Boolean(process.env.CRON_SECRET), detail: "Cron route protection" },
      { key: "RESEND_API_KEY", enabled: Boolean(process.env.RESEND_API_KEY), detail: "Email delivery" },
      {
        key: "LLM_FORCE_BLOCK_FREE_PROVIDERS",
        enabled: /^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? ""),
        detail: "Emergency kill switch",
        inverted: true,
      },
    ],
    security: {
      jobs: backgroundJobs.slice(0, 12).map((job) => ({
        id: job.id,
        type: job.job_type,
        status: job.status,
        userId: job.user_id,
        queuedAt: job.queued_at,
        error: job.error_code ?? job.error_message ?? null,
      })),
      dpdp: dpdpEvents.map((event) => ({
        event: event.event,
        userId: event.user_id,
        createdAt: event.created_at,
        metadata: JSON.stringify(event.metadata ?? {}).slice(0, 120),
      })),
    },
    exports: {
      usersCsv: toCsv([
        ["email", "name", "role", "resume", "resume_score", "last_match_compute"],
        ...users.map((user) => {
          const profile = profileById.get(user.id);
          return [
            user.email ?? "",
            profile?.display_name ?? "",
            profile?.role_function ?? profile?.current_role ?? "",
            profile?.resume_storage_path ? "yes" : "no",
            String(profile?.resume_score ?? profile?.product_dna_score ?? ""),
            profile?.last_match_compute_at ?? "",
          ];
        }),
      ]),
      jobsCsv: toCsv([
        ["company", "title", "location", "active", "quality", "parsed", "apply_clicks"],
        ...jobs.map((job) => [
          job.companies?.name ?? "",
          job.title,
          job.location ?? "",
          String(job.is_active),
          String(job.quality_score ?? ""),
          job.jd_parsed_at ? "yes" : "no",
          String(job.apply_click_count ?? 0),
        ]),
      ]),
    },
  };

  return <AdminControlRoom data={data} />;
}

function buildJobsQuery(admin: ReturnType<typeof createSupabaseAdminClient>, jobQuery: string) {
  let query = admin
    .from("jobs")
    .select("id, title, location, is_active, quality_score, quality_reasons, jd_parsed_at, is_likely_ghost, apply_click_count, role_function_jd, last_seen_at, updated_at, companies(name, slug)")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(30) as any;
  if (jobQuery) query = query.ilike("title", `%${jobQuery}%`);
  return query;
}

async function getProfileMetrics(admin: ReturnType<typeof createSupabaseAdminClient>, since24h: string, since7d: string) {
  const [
    totalUsers,
    usersWithResume,
    parsedResumes,
    parseErrors,
    resumesUploadedToday,
    resumesUploaded7d,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_storage_path", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_parsed", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_parse_error", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since24h).not("resume_storage_path", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", since7d).not("resume_storage_path", "is", null),
  ]);
  return {
    totalUsers: totalUsers.count ?? 0,
    usersWithResume: usersWithResume.count ?? 0,
    parsedResumes: parsedResumes.count ?? 0,
    parseErrors: parseErrors.count ?? 0,
    resumesUploadedToday: resumesUploadedToday.count ?? 0,
    resumesUploaded7d: resumesUploaded7d.count ?? 0,
  };
}

function filterUsers(users: AuthUser[], profiles: Map<string, ProfileRow>, query: string) {
  if (!query) return users;
  const q = query.toLowerCase();
  return users.filter((user) => {
    const profile = profiles.get(user.id);
    return [
      user.email,
      profile?.display_name,
      profile?.current_role,
      profile?.role_function,
    ].some((value) => value?.toLowerCase().includes(q));
  });
}

function cleanParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function extractStringArray(value: unknown, key: string): string[] {
  if (!value || typeof value !== "object") return [];
  const arr = (value as Record<string, unknown>)[key];
  return Array.isArray(arr) ? arr.filter((item): item is string => typeof item === "string") : [];
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
}
