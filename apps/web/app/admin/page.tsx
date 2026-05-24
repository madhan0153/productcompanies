import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  LibraryBig,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { describeLlmRuntime, getDsaRoleStats } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { scoreFleet, type CrawlRunRow, type CompanyRow } from "@/lib/admin/crawler-resilience";

export const metadata: Metadata = { title: "Admin | Control Room" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = {
  q?: string;
  job?: string;
  page?: string;
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
  id?: string;
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

type AdminPageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function AdminControlRoom({ searchParams }: AdminPageProps) {
  const params = (await searchParams) ?? {};
  const userQuery = cleanParam(params.q);
  const jobQuery = cleanParam(params.job);
  const userPage = Math.max(1, Number(params.page ?? "1") || 1);
  const perPage = 24;

  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const since24h = new Date(now - 24 * 3_600_000).toISOString();
  const since7d = new Date(now - 7 * 24 * 3_600_000).toISOString();
  const since14d = new Date(now - 14 * 24 * 3_600_000).toISOString();

  const authUsersPromise = admin.auth.admin.listUsers({ page: userPage, perPage });

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
    authUsersPromise,
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
      .limit(12) as any),
    getProfileMetrics(admin, since24h, since7d),
    (admin
      .from("background_jobs")
      .select("id, user_id, job_type, status, error_code, error_message, queued_at, finished_at")
      .order("queued_at", { ascending: false })
      .limit(18) as any),
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
      .limit(16) as any),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("interview_daily_dispatch").select("problem_slug", { count: "exact", head: true }),
    (admin
      .from("dpdp_events")
      .select("id, user_id, event, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(10) as any),
  ]);

  const profiles = ((profilesResult.data ?? []) as ProfileRow[]);
  const authUsers = ((authUsersResult.data?.users ?? []) as AuthUser[]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const visibleUsers = filterUsers(authUsers, profileById, userQuery);
  const companies = (companiesResult.data ?? []) as Array<CompanyRow & { logo_url: string | null }>;
  const crawlerRuns = (crawlerRunsResult.data ?? []) as CrawlRunRow[];
  const jobs = (jobsResult.data ?? []) as JobRow[];
  const matches = (matchesResult.data ?? []) as MatchRow[];
  const backgroundJobs = (backgroundJobsResult.data ?? []) as BackgroundJob[];
  const intelEvents = (intelEventsResult.data ?? []) as ResumeIntelEvent[];
  const runtime = describeLlmRuntime();

  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const run of crawlerRuns) {
    if (!runsByCompany.has(run.company_id)) runsByCompany.set(run.company_id, []);
    runsByCompany.get(run.company_id)!.push(run);
  }
  const fleet = scoreFleet(companies, runsByCompany);

  const parseAttempts = backgroundJobs.filter((j) => j.job_type === "resume_parse");
  const parseSucceeded = parseAttempts.filter((j) => j.status === "succeeded").length;
  const parseFailed = parseAttempts.filter((j) => j.status === "failed").length;
  const parseSuccessRate = parseAttempts.length === 0 ? 100 : Math.round((parseSucceeded / parseAttempts.length) * 100);
  const matchComputes24h = backgroundJobs.filter((j) => j.job_type === "match_compute" && new Date(j.queued_at).getTime() >= new Date(since24h).getTime()).length;
  const intelOk = intelEvents.filter((e) => e.ok).length;
  const intelSuccessRate = intelEvents.length === 0 ? 100 : Math.round((intelOk / intelEvents.length) * 100);
  const avgLatency = average(intelEvents.map((e) => e.latency_ms).filter((v): v is number => typeof v === "number"));
  const aiResumeArtifacts = (enhancedResult.count ?? 0) + (tailoredResult.count ?? 0);
  const topSkills = topValues(profiles.flatMap((p) => extractStringArray(p.resume_parsed, "tech_stack")), 8);
  const roleMix = topValues(profiles.map((p) => p.role_function).filter(Boolean) as string[], 8);
  const dsaStats = getDsaRoleStats();
  const usersCsv = toCsv([
    ["email", "display_name", "role", "resume", "last_match_compute"],
    ...visibleUsers.map((user) => {
      const profile = profileById.get(user.id);
      return [
        user.email ?? "",
        profile?.display_name ?? "",
        profile?.role_function ?? "",
        profile?.resume_storage_path ? "yes" : "no",
        profile?.last_match_compute_at ?? "",
      ];
    }),
  ]);
  const jobsCsv = toCsv([
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
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Enterprise Control Room</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Admin Panel</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Users, resumes, live jobs, crawler reliability, LLM routing, DSA content, and security signals in one protected operator surface.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:flex">
          <QuickLink href="/admin/crawler-intel" label="Crawler Intel" />
          <QuickLink href="/admin/ai-ops" label="AI Ops" />
          <QuickLink href="/admin/health" label="Ops Health" />
          <QuickLink href="/api/health" label="API Health" external />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users />} label="Total users" value={String(profileMetrics.totalUsers)} sub={`${profileMetrics.resumesUploadedToday} resumes today, ${profileMetrics.resumesUploaded7d} this week`} tone="blue" />
        <MetricCard icon={<FileText />} label="Parse success" value={`${parseSuccessRate}%`} sub={`${parseSucceeded} succeeded, ${parseFailed} failed in latest jobs`} tone={parseSuccessRate >= 90 ? "green" : "amber"} />
        <MetricCard icon={<Briefcase />} label="Live jobs" value={String(activeJobsResult.count ?? 0)} sub={`${jobs.filter((j) => j.jd_parsed_at).length} shown parsed in table`} tone="violet" />
        <MetricCard icon={<BrainCircuit />} label="LLM providers" value={`${runtime.providers.length}/${runtime.presets.length}`} sub={`${runtime.providers.reduce((sum, p) => sum + p.keyCount, 0)} external keys configured`} tone="green" />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <HealthPanel title="Crawler fleet" icon={<Radar />} value={`${fleet.overall.fleetGrade} / ${fleet.overall.fleetScore}`} sub={`${fleet.overall.companiesAtRisk} companies at risk, ${Math.round(fleet.overall.adaptiveCoverage * 100)}% adaptive coverage`} status={fleet.overall.companiesAtRisk === 0 ? "ok" : "warn"} />
        <HealthPanel title="Resume intelligence" icon={<Sparkles />} value={`${intelSuccessRate}% ok`} sub={`${intelEvents.length} events in 7d, avg latency ${avgLatency ? `${avgLatency}ms` : "n/a"}`} status={intelSuccessRate >= 90 ? "ok" : "warn"} />
        <HealthPanel title="Queue pressure" icon={<Gauge />} value={String(backgroundJobs.filter((j) => j.status === "queued" || j.status === "running").length)} sub={`${matchComputes24h} match jobs queued in 24h`} status={backgroundJobs.some((j) => j.status === "failed") ? "warn" : "ok"} />
      </section>

      <Section id="users" title="User Management" icon={<Users />} action={<ExportLink filename="prodmatch-users.csv" csv={usersCsv} />}>
        <FilterBar q={userQuery} job={jobQuery} />
        <ResponsiveTable
          columns={["User", "Resume", "Role signal", "Last compute", "Admin actions"]}
          rows={visibleUsers.map((user) => {
            const profile = profileById.get(user.id);
            const banned = user.banned_until && new Date(user.banned_until).getTime() > Date.now();
            return [
              <div key="u" className="min-w-0">
                <p className="truncate font-medium">{user.email ?? user.id}</p>
                <p className="text-[11px] text-muted-foreground">Joined {dateShort(user.created_at)}</p>
              </div>,
              <StatusBadge key="r" tone={profile?.resume_storage_path ? "ok" : "muted"}>{profile?.resume_storage_path ? "Uploaded" : "Missing"}</StatusBadge>,
              <div key="role" className="text-xs">
                <p>{profile?.role_function ?? profile?.current_role ?? "Unknown"}</p>
                <p className="text-muted-foreground">{(profile?.target_role_functions ?? []).slice(0, 2).join(", ") || "No targets"}</p>
              </div>,
              <span key="c" className="text-xs text-muted-foreground">{timeAgo(profile?.last_match_compute_at)}</span>,
              <div key="a" className="flex flex-wrap gap-1.5">
                <ActionPill label="View" />
                <ActionPill label={banned ? "Suspended" : "Suspend"} tone={banned ? "danger" : "muted"} />
                <ActionPill label="Delete" tone="danger" />
              </div>,
            ];
          })}
          empty="No users match the current search."
        />
      </Section>

      <Section id="resumes" title="Resume Management" icon={<FileText />}>
        <div className="grid gap-3 md:grid-cols-5">
          <MiniStat label="Uploaded" value={String(profileMetrics.usersWithResume)} />
          <MiniStat label="Parsed" value={String(profileMetrics.parsedResumes)} />
          <MiniStat label="Parse errors" value={String(profileMetrics.parseErrors)} />
          <MiniStat label="AI artifacts" value={String(aiResumeArtifacts)} />
          <MiniStat label="Snapshots" value={String(resumeVersionsResult.count ?? 0)} />
        </div>
        <ResponsiveTable
          columns={["Candidate", "Score", "Parse state", "History", "Ops"]}
          rows={profiles.filter((p) => p.resume_storage_path).slice(0, 12).map((profile) => [
            <div key="c">
              <p className="font-medium">{profile.display_name ?? profile.id.slice(0, 8)}</p>
              <p className="text-[11px] text-muted-foreground">{profile.current_role ?? profile.job_title ?? "No headline"}</p>
            </div>,
            <span key="s" className="font-semibold tabular-nums">{profile.resume_score ?? profile.product_dna_score ?? "-"}</span>,
            <StatusBadge key="p" tone={profile.resume_parse_error ? "danger" : profile.resume_parsing_at ? "warn" : "ok"}>
              {profile.resume_parse_error ? "Failed" : profile.resume_parsing_at ? "Parsing" : "Ready"}
            </StatusBadge>,
            <span key="h" className="text-xs text-muted-foreground">{dateShort(profile.updated_at)}</span>,
            <div key="o" className="flex flex-wrap gap-1.5"><ActionPill label="Raw" /><ActionPill label="Parsed" /><ActionPill label="Re-parse" /></div>,
          ])}
          empty="No resumes uploaded yet."
        />
      </Section>

      <Section id="jobs" title="Job & Match Management" icon={<Briefcase />} action={<ExportLink filename="prodmatch-jobs.csv" csv={jobsCsv} />}>
        <FilterBar q={userQuery} job={jobQuery} focus="job" />
        <ResponsiveTable
          columns={["Job", "Quality", "Enrichment", "Apply intent", "Ops"]}
          rows={jobs.map((job) => [
            <div key="j" className="min-w-0">
              <p className="truncate font-medium">{job.title}</p>
              <p className="text-[11px] text-muted-foreground">{job.companies?.name ?? "Unknown"} / {job.location ?? "Location n/a"}</p>
            </div>,
            <div key="q"><Progress value={Math.round(job.quality_score ?? 100)} /></div>,
            <div key="e" className="flex flex-wrap gap-1.5">
              <StatusBadge tone={job.jd_parsed_at ? "ok" : "warn"}>{job.jd_parsed_at ? "JD parsed" : "Pending"}</StatusBadge>
              {job.is_likely_ghost && <StatusBadge tone="danger">Ghost</StatusBadge>}
            </div>,
            <span key="a" className="font-semibold tabular-nums">{job.apply_click_count ?? 0}</span>,
            <div key="o" className="flex flex-wrap gap-1.5"><ActionPill label="Edit" /><ActionPill label="Approve" /><ActionPill label="Re-enrich" /></div>,
          ])}
          empty="No jobs match the current filter."
        />
        <Subsection title="Recent matches">
          <ResponsiveTable
            columns={["Role", "Score", "Verdict", "Computed", "State"]}
            rows={matches.map((match) => [
              <span key="r" className="font-medium">{match.jobs?.title ?? match.job_id.slice(0, 8)}</span>,
              <span key="s" className="tabular-nums">{Math.round(match.score)}{match.confidence ? ` / ${Math.round(match.confidence)} conf` : ""}</span>,
              <StatusBadge key="v" tone={match.verdict === "strong_fit" ? "ok" : "muted"}>{match.verdict ?? "scored"}</StatusBadge>,
              <span key="t" className="text-xs text-muted-foreground">{timeAgo(match.computed_at)}</span>,
              <StatusBadge key="h" tone={match.user_hidden ? "warn" : "ok"}>{match.user_hidden ? "Hidden" : "Visible"}</StatusBadge>,
            ])}
            empty="No match rows yet."
          />
        </Subsection>
      </Section>

      <Section id="crawler" title="Crawler Management" icon={<Radar />} action={<LinkButton href="/admin/crawler-intel" label="Open crawler intel" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <MiniStat label="Approved companies" value={String(companies.length)} />
          <MiniStat label="Runs in 14d" value={String(crawlerRuns.length)} />
          <MiniStat label="At risk" value={String(fleet.overall.companiesAtRisk)} />
        </div>
        <ResponsiveTable
          columns={["Company", "Latest status", "Last run", "New/updated", "Ops"]}
          rows={fleet.perCompany.slice(0, 12).map((company) => {
            const latest = company.runs[0];
            return [
              <span key="c" className="font-medium">{company.company.name}</span>,
              <StatusBadge key="s" tone={company.latestStatus === "success" ? "ok" : company.latestStatus === "failed" ? "danger" : "warn"}>{company.latestStatus}</StatusBadge>,
              <span key="t" className="text-xs text-muted-foreground">{timeAgo(company.latestAt)}</span>,
              <span key="n" className="text-xs tabular-nums">{latest ? `+${latest.jobs_new ?? 0} / ${latest.jobs_updated ?? 0}` : "-"}</span>,
              <div key="o" className="flex flex-wrap gap-1.5"><ActionPill label="Trigger" /><ActionPill label="Logs" /><ActionPill label="Config" /></div>,
            ];
          })}
          empty="No crawler metadata found."
        />
      </Section>

      <Section id="llm" title="LLM & Parsing Management" icon={<BrainCircuit />} action={<LinkButton href="/admin/ai-ops" label="Provider matrix" />}>
        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat label="Gemini keys" value={String((process.env.GEMINI_API_KEY ?? "").split(",").filter(Boolean).length)} />
          <MiniStat label="External providers" value={String(runtime.providers.length)} />
          <MiniStat label="Dead keys" value={String((deadKeysResult.data ?? []).length)} />
          <MiniStat label="Resume intel runs" value={String(intelEvents.length)} />
        </div>
        <ResponsiveTable
          columns={["Provider", "Capability", "Failure", "Dead until", "Detected"]}
          rows={((deadKeysResult.data ?? []) as Array<{ provider_id: string; model: string; capability: string; failure_kind: string; dead_until: string; detected_at: string }>).map((key) => [
            <div key="p"><p className="font-medium">{key.provider_id}</p><p className="text-[11px] text-muted-foreground">{key.model}</p></div>,
            <StatusBadge key="c" tone="muted">{key.capability}</StatusBadge>,
            <StatusBadge key="f" tone="danger">{key.failure_kind}</StatusBadge>,
            <span key="d" className="text-xs text-muted-foreground">{timeAgo(key.dead_until)}</span>,
            <span key="t" className="text-xs text-muted-foreground">{timeAgo(key.detected_at)}</span>,
          ])}
          empty="No dead provider keys currently recorded."
        />
      </Section>

      <Section id="analytics" title="Analytics & Insights" icon={<BarChart3 />}>
        <div className="grid gap-3 md:grid-cols-2">
          <RankList title="Top skills in uploaded resumes" items={topSkills} />
          <RankList title="Role-function mix" items={roleMix} />
        </div>
      </Section>

      <Section id="content" title="Content Management" icon={<LibraryBig />}>
        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat label="DSA problems" value={String(dsaStats.reduce((sum, role) => sum + role.problemCount, 0))} />
          <MiniStat label="Role tracks" value={String(dsaStats.length)} />
          <MiniStat label="Daily dispatches" value={String(dispatchResult.count ?? 0)} />
          <MiniStat label="Guides" value="5" />
        </div>
        <ResponsiveTable
          columns={["Track", "Problems", "Difficulty mix", "Concepts"]}
          rows={dsaStats.map((track) => [
            <span key="t" className="font-medium">{track.label}</span>,
            <span key="p" className="tabular-nums">{track.problemCount}</span>,
            <span key="d" className="text-xs text-muted-foreground">{track.hard} hard / {track.medium} medium / {track.easy} easy</span>,
            <span key="c" className="text-xs text-muted-foreground">{track.concepts.slice(0, 3).join(", ")}</span>,
          ])}
          empty="No DSA tracks configured."
        />
      </Section>

      <Section id="settings" title="Settings" icon={<Settings />}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <ConfigCard label="ADMIN_EMAILS" enabled={Boolean(process.env.ADMIN_EMAILS)} detail={process.env.ADMIN_EMAILS ? `${process.env.ADMIN_EMAILS.split(",").filter(Boolean).length} admins` : "Unset"} />
          <ConfigCard label="CRON_SECRET" enabled={Boolean(process.env.CRON_SECRET)} detail="Required for cron triggers" />
          <ConfigCard label="RESEND_API_KEY" enabled={Boolean(process.env.RESEND_API_KEY)} detail="Email delivery" />
          <ConfigCard label="LLM_FORCE_BLOCK_FREE_PROVIDERS" enabled={/^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? "")} detail="Emergency LLM kill switch" invert />
        </div>
      </Section>

      <Section id="security" title="Activity Logs & Security" icon={<ShieldAlert />}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Subsection title="Recent background jobs">
            <ResponsiveTable
              columns={["Type", "Status", "User", "Queued", "Error"]}
              rows={backgroundJobs.slice(0, 10).map((job) => [
                <span key="t">{job.job_type}</span>,
                <StatusBadge key="s" tone={job.status === "failed" ? "danger" : job.status === "succeeded" ? "ok" : "warn"}>{job.status}</StatusBadge>,
                <span key="u" className="text-xs">{job.user_id.slice(0, 8)}</span>,
                <span key="q" className="text-xs text-muted-foreground">{timeAgo(job.queued_at)}</span>,
                <span key="e" className="max-w-[14rem] truncate text-xs text-muted-foreground">{job.error_code ?? job.error_message ?? "-"}</span>,
              ])}
              empty="No background jobs found."
            />
          </Subsection>
          <Subsection title="DPDP audit trail">
            <ResponsiveTable
              columns={["Event", "User", "When", "Metadata"]}
              rows={((dpdpResult.data ?? []) as Array<{ event: string; user_id: string | null; created_at: string; metadata: unknown }>).map((event) => [
                <StatusBadge key="e" tone="muted">{event.event}</StatusBadge>,
                <span key="u" className="text-xs">{event.user_id?.slice(0, 8) ?? "-"}</span>,
                <span key="w" className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</span>,
                <span key="m" className="max-w-[12rem] truncate text-xs text-muted-foreground">{JSON.stringify(event.metadata ?? {})}</span>,
              ])}
              empty="No DPDP events recorded."
            />
          </Subsection>
        </div>
      </Section>
    </div>
  );
}

function buildJobsQuery(admin: ReturnType<typeof createSupabaseAdminClient>, jobQuery: string) {
  let query = admin
    .from("jobs")
    .select("id, title, location, is_active, quality_score, quality_reasons, jd_parsed_at, is_likely_ghost, apply_click_count, role_function_jd, last_seen_at, updated_at, companies(name, slug)")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(24) as any;
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

function Section({ id, title, icon, action, children }: { id: string; title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-border bg-card/35 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-[11px] text-muted-foreground">Live service-role data. Mutating controls are intentionally compact.</p>
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "blue" | "green" | "amber" | "violet" }) {
  const toneClass = {
    blue: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border [&>svg]:h-4 [&>svg]:w-4 ${toneClass}`}>{icon}</span>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">{sub}</p>
    </div>
  );
}

function HealthPanel({ title, icon, value, sub, status }: { title: string; icon: React.ReactNode; value: string; sub: string; status: "ok" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <StatusBadge tone={status === "ok" ? "ok" : "warn"}>{status === "ok" ? "Healthy" : "Watch"}</StatusBadge>
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">{sub}</p>
    </div>
  );
}

function ResponsiveTable({ columns, rows, empty }: { columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background/30">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr key={i} className="align-middle">
              {row.map((cell, j) => <td key={j} className="max-w-[22rem] px-3 py-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilterBar({ q, job, focus }: { q: string; job: string; focus?: "job" }) {
  return (
    <form className="grid gap-2 rounded-lg border border-border bg-background/35 p-3 sm:grid-cols-[1fr_1fr_auto]" action="/admin">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder="Search users by email or name" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </label>
      <label className="relative">
        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input name="job" defaultValue={job} placeholder="Filter jobs by title" autoFocus={focus === "job"} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </label>
      <button className="inline-flex h-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary hover:bg-primary/15">Apply filters</button>
    </form>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/35 p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: "ok" | "warn" | "danger" | "muted"; children: React.ReactNode }) {
  const cls = {
    ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    danger: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    muted: "border-border bg-muted/20 text-muted-foreground",
  }[tone];
  return <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function ActionPill({ label, tone = "muted" }: { label: string; tone?: "muted" | "danger" }) {
  const cls = tone === "danger" ? "border-rose-500/25 text-rose-300 hover:bg-rose-500/10" : "border-border text-muted-foreground hover:bg-muted/20 hover:text-foreground";
  return <button type="button" className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</button>;
}

function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-28">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>Quality</span><span>{clamped}</span></div>
      <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} /></div>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <div className="rounded-lg border border-border bg-background/35 p-3">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-xs text-muted-foreground">No data yet.</p> : items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigCard({ label, enabled, detail, invert = false }: { label: string; enabled: boolean; detail: string; invert?: boolean }) {
  const healthy = invert ? !enabled : enabled;
  return (
    <div className="rounded-lg border border-border bg-background/35 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <code className="text-[11px]">{label}</code>
        {healthy ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-amber-400" />}
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function QuickLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
      {label}
      {external ? <ArrowUpRight className="h-3 w-3" /> : null}
    </Link>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15">{label}<ArrowUpRight className="h-3 w-3" /></Link>;
}

function ExportLink({ filename, csv }: { filename: string; csv: string }) {
  return (
    <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={filename} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
      <Download className="h-3.5 w-3.5" /> Export CSV
    </a>
  );
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

function timeAgo(value: string | null | undefined) {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "unknown";
  if (diff < 0) return "future";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function dateShort(value: string | undefined | null) {
  if (!value) return "unknown";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function extractStringArray(value: unknown, key: string): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const arr = record[key];
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
