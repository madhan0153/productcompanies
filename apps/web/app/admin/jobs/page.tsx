import type { Metadata } from "next";
import { Briefcase, Search, GitMerge } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, CsvButton, DataGrid, IdentityCell,
  MetricStrip, MiniMetric, MobileRecord, PageHeader, Panel,
  Progress, SectionDivider, timeAgo,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Jobs & Matches" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = { job?: string; company?: string };

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  is_active: boolean;
  quality_score: number | null;
  jd_parsed_at: string | null;
  is_likely_ghost: boolean;
  apply_click_count: number | null;
  role_function_jd: string | null;
  last_seen_at: string | null;
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

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params      = (await searchParams) ?? {};
  const jobQuery    = (params.job     ?? "").trim();
  const companyFilter = (params.company ?? "").trim();

  const admin = createSupabaseAdminClient();

  let jobsQ = admin
    .from("jobs")
    .select("id, title, location, is_active, quality_score, jd_parsed_at, is_likely_ghost, apply_click_count, role_function_jd, last_seen_at, companies(name, slug)")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(60) as any;
  if (jobQuery)     jobsQ = jobsQ.ilike("title", `%${jobQuery}%`);
  if (companyFilter) jobsQ = jobsQ.ilike("companies.name", `%${companyFilter}%`);

  const [
    jobsResult,
    activeCountResult,
    parsedCountResult,
    ghostCountResult,
    matchesResult,
    companiesResult,
  ] = await Promise.all([
    jobsQ,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).not("jd_parsed_at", "is", null).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_likely_ghost", true).eq("is_active", true),
    admin
      .from("matches")
      .select("user_id, job_id, score, confidence, verdict, computed_at, user_hidden, jobs(title, companies(name))")
      .order("computed_at", { ascending: false })
      .limit(20) as any,
    admin.from("companies").select("name").order("name") as any,
  ]);

  const jobs     = (jobsResult.data     ?? []) as JobRow[];
  const matches  = (matchesResult.data  ?? []) as MatchRow[];
  const companies = ((companiesResult.data ?? []) as Array<{ name: string }>).map((c) => c.name);

  const verdictCounts = new Map<string, number>();
  for (const m of matches) {
    const v = m.verdict ?? "scored";
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1);
  }

  const csv = toCsv([
    ["Company", "Title", "Location", "Active", "Quality", "Parsed", "Ghost", "Apply clicks"],
    ...jobs.map((j) => [
      j.companies?.name ?? "",
      j.title,
      j.location ?? "",
      String(j.is_active),
      String(Math.round(j.quality_score ?? 0)),
      j.jd_parsed_at ? "yes" : "no",
      j.is_likely_ghost ? "yes" : "no",
      String(j.apply_click_count ?? 0),
    ]),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Jobs"
        title="Job & Match Management"
        description="Monitor job quality, enrichment status, and computed matches."
        action={<CsvButton filename="prodmatch-jobs.csv" csv={csv} />}
      />

      <MetricStrip>
        <MiniMetric label="Active jobs"  value={activeCountResult.count ?? 0} />
        <MiniMetric label="JD parsed"    value={parsedCountResult.count ?? 0} />
        <MiniMetric label="Ghost flags"  value={ghostCountResult.count ?? 0}  tone={(ghostCountResult.count ?? 0) > 0 ? "warn" : undefined} />
        <MiniMetric label="Matches shown" value={matches.length} />
      </MetricStrip>

      {/* Filters */}
      <form action="/admin/jobs" className="mb-4 flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="job"
            defaultValue={jobQuery}
            placeholder="Filter by job title…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <select
          name="company"
          defaultValue={companyFilter}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All companies</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="submit"
          className="press h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-ring"
        >
          Apply
        </button>
      </form>

      {/* Jobs table */}
      <Panel icon={Briefcase} title="Jobs" description={`${jobs.length} rows${jobQuery ? ` · filtered by "${jobQuery}"` : ""}`}>
        <DataGrid
          columns={["Role", "Quality", "Enrichment", "Apply clicks", "Last seen"]}
          rows={jobs}
          getKey={(r) => r.id}
          empty="No jobs match the current filter."
          renderMobile={(r) => (
            <MobileRecord
              title={r.title}
              eyebrow={`${r.companies?.name ?? "?"} · ${r.location ?? "Remote"}`}
              status={
                <Badge tone={r.is_likely_ghost ? "danger" : r.jd_parsed_at ? "ok" : "warn"}>
                  {r.is_likely_ghost ? "Ghost" : r.jd_parsed_at ? "Parsed" : "Pending"}
                </Badge>
              }
              meta={[
                ["Quality", String(Math.round(r.quality_score ?? 0))],
                ["Clicks",  String(r.apply_click_count ?? 0)],
                ["Seen",    timeAgo(r.last_seen_at)],
                ["Role",    r.role_function_jd ?? "—"],
              ]}
            />
          )}
          renderCells={(r) => [
            <IdentityCell key="role"
              title={r.title}
              subtitle={`${r.companies?.name ?? "?"} · ${r.location ?? "Remote"}`}
            />,
            <Progress key="quality" value={Math.round(r.quality_score ?? 0)} />,
            <div key="enrich" className="flex flex-wrap gap-1">
              <Badge tone={r.jd_parsed_at ? "ok" : "warn"}>{r.jd_parsed_at ? "Parsed" : "Pending"}</Badge>
              {r.is_likely_ghost && <Badge tone="danger">Ghost</Badge>}
            </div>,
            <span key="clicks" className="font-semibold tabular-nums">{r.apply_click_count ?? 0}</span>,
            <span key="seen" className="text-xs text-muted-foreground">{timeAgo(r.last_seen_at)}</span>,
          ]}
        />
      </Panel>

      <SectionDivider title="Recent matches" />

      {/* Verdict breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[...verdictCounts.entries()].map(([verdict, count]) => (
          <div key={verdict} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold tabular-nums">{count}</span>{" "}
            <span className="text-muted-foreground">{verdict}</span>
          </div>
        ))}
      </div>

      <Panel icon={GitMerge} title="Matches" description="Last 20 computed matches">
        <DataGrid
          columns={["Role", "Score", "Verdict", "Computed", "Visibility"]}
          rows={matches}
          getKey={(r) => `${r.user_id}-${r.job_id}`}
          empty="No matches computed yet."
          renderMobile={(r) => (
            <MobileRecord
              title={r.jobs?.title ?? r.job_id.slice(0, 8)}
              eyebrow={r.jobs?.companies?.name ?? "Unknown"}
              status={<Badge tone={r.verdict === "strong_fit" ? "ok" : "muted"}>{r.verdict ?? "scored"}</Badge>}
              meta={[
                ["Score",    `${Math.round(r.score)}${r.confidence != null ? ` / ${Math.round(r.confidence)}` : ""}`],
                ["Computed", timeAgo(r.computed_at)],
                ["State",    r.user_hidden ? "Hidden" : "Visible"],
              ]}
            />
          )}
          renderCells={(r) => [
            <IdentityCell key="role"
              title={r.jobs?.title ?? r.job_id.slice(0, 8)}
              subtitle={r.jobs?.companies?.name ?? "Unknown"}
            />,
            <span key="score" className="tabular-nums">
              {Math.round(r.score)}
              {r.confidence != null && <span className="text-muted-foreground"> / {Math.round(r.confidence)}</span>}
            </span>,
            <Badge key="verdict" tone={r.verdict === "strong_fit" ? "ok" : "muted"}>
              {r.verdict ?? "scored"}
            </Badge>,
            <span key="when" className="text-xs text-muted-foreground">{timeAgo(r.computed_at)}</span>,
            <Badge key="vis" tone={r.user_hidden ? "warn" : "ok"}>
              {r.user_hidden ? "Hidden" : "Visible"}
            </Badge>,
          ]}
        />
      </Panel>
    </div>
  );
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
}
