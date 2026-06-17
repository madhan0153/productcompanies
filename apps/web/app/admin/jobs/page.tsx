import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, Pager, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Jobs & Matches" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = { job?: string; company?: string; page?: string };

const JOBS_PAGE_SIZE = 50;

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
  const params        = (await searchParams) ?? {};
  const jobQuery      = (params.job     ?? "").trim();
  const companyFilter = (params.company ?? "").trim();
  const page          = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const from          = (page - 1) * JOBS_PAGE_SIZE;

  const admin = createSupabaseAdminClient();

  type JobsBuilder = ReturnType<typeof admin.from>;
  // When filtering by company, the embed MUST be an inner join — a plain
  // (left) embed lets PostgREST apply `companies.name` to the embedded
  // resource only, so non-matching jobs still return (with companies=null)
  // and the filter silently does nothing. `!inner` restricts the parent rows.
  const companyEmbed = companyFilter ? "companies!inner(name, slug)" : "companies(name, slug)";
  let jobsQ = admin
    .from("jobs")
    .select(`id, title, location, is_active, quality_score, jd_parsed_at, is_likely_ghost, apply_click_count, role_function_jd, last_seen_at, ${companyEmbed}`)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .range(from, from + JOBS_PAGE_SIZE - 1) as unknown as JobsBuilder;
  if (jobQuery)      jobsQ = (jobsQ as never as { ilike: (a: string, b: string) => JobsBuilder }).ilike("title", `%${jobQuery}%`);
  if (companyFilter) jobsQ = (jobsQ as never as { ilike: (a: string, b: string) => JobsBuilder }).ilike("companies.name", `%${companyFilter}%`);

  // Total matching the SAME filters, so the pager + "N of M" are accurate.
  type CountBuilder = { ilike: (a: string, b: string) => CountBuilder };
  let jobsCountQ = admin
    .from("jobs")
    .select(companyFilter ? "id, companies!inner(name)" : "id", { count: "exact", head: true }) as unknown as CountBuilder;
  if (jobQuery)      jobsCountQ = jobsCountQ.ilike("title", `%${jobQuery}%`);
  if (companyFilter) jobsCountQ = jobsCountQ.ilike("companies.name", `%${companyFilter}%`);

  const [
    jobsResult,
    jobsCountResult,
    activeCountResult,
    parsedCountResult,
    ghostCountResult,
    matchesResult,
    companiesResult,
  ] = await Promise.all([
    jobsQ,
    jobsCountQ as unknown as Promise<{ count: number | null }>,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).not("jd_parsed_at", "is", null).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_likely_ghost", true).eq("is_active", true),
    admin
      .from("matches")
      .select("user_id, job_id, score, confidence, verdict, computed_at, user_hidden, jobs(title, companies(name))")
      .order("computed_at", { ascending: false })
      .limit(20) as never,
    admin.from("companies").select("name").order("name") as never,
  ]);

  const jobs      = ((jobsResult       as unknown as { data: JobRow[]   | null }).data ?? []);
  const totalJobs = jobsCountResult.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalJobs / JOBS_PAGE_SIZE));
  const mkJobsHref = (p: number) => {
    const sp = new URLSearchParams();
    if (jobQuery) sp.set("job", jobQuery);
    if (companyFilter) sp.set("company", companyFilter);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/jobs${qs ? `?${qs}` : ""}`;
  };
  const jobsPrevHref = page > 1 ? mkJobsHref(page - 1) : null;
  const jobsNextHref = page < pageCount ? mkJobsHref(page + 1) : null;
  const matches   = ((matchesResult    as { data: MatchRow[] | null }).data ?? []);
  const companies = (((companiesResult as { data: Array<{ name: string }> | null }).data ?? [])).map((c) => c.name);

  const verdictCounts = new Map<string, number>();
  for (const m of matches) {
    const v = m.verdict ?? "scored";
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1);
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Jobs
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Job & Match Management
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Monitor job quality, enrichment status, and computed matches.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Active jobs"    value={String(activeCountResult.count ?? 0)} accent />
        <KPI label="JD parsed"      value={String(parsedCountResult.count ?? 0)} />
        <KPI label="Ghost flags"    value={String(ghostCountResult.count  ?? 0)} hint={(ghostCountResult.count ?? 0) > 0 ? "review" : "none"} />
        <KPI label="Matches shown"  value={String(matches.length)} />
      </div>

      {/* Filters */}
      <form action="/admin/jobs" style={{ marginTop: 22, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <div style={{
          flex: 1, minWidth: 200,
          display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          height: 38, background: "var(--surface-2)", borderRadius: 10,
          border: "1px solid transparent",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-3)" }}>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            name="job"
            defaultValue={jobQuery}
            placeholder="Filter by job title…"
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontFamily: "inherit", fontSize: 14, color: "var(--text)", minWidth: 0,
            }}
          />
        </div>
        <select
          name="company"
          defaultValue={companyFilter}
          style={{
            height: 38, padding: "0 12px", borderRadius: 10,
            background: "var(--surface)", border: "1px solid var(--line)",
            color: "var(--text)", fontFamily: "inherit", fontSize: 14, outline: "none",
          }}
        >
          <option value="">All companies</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="submit"
          className="pm-btn"
          data-variant="primary"
          style={{
            height: 38, padding: "0 16px", borderRadius: 9,
            background: "var(--accent)", color: "var(--accent-ink)",
            border: "1px solid transparent", cursor: "pointer",
            fontSize: 13, fontWeight: 500,
          }}
        >
          Apply
        </button>
      </form>

      {/* Jobs */}
      <SectionHeader
        title="Jobs"
        sub={`${totalJobs.toLocaleString("en-IN")} total${jobQuery ? ` · filtered by "${jobQuery}"` : ""}${companyFilter ? ` · ${companyFilter}` : ""}`}
      />
      <Card p={0}>
        {jobs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No jobs match the current filter.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {jobs.map((r, i) => (
              <ListRow
                key={r.id}
                divider={i < jobs.length - 1}
                title={r.title}
                subtitle={`${r.companies?.name ?? "?"} · ${r.location ?? "Remote"}${r.role_function_jd ? ` · ${r.role_function_jd}` : ""}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <QualityChip score={Math.round(r.quality_score ?? 0)} />
                    <Badge tone={r.is_likely_ghost ? "err" : r.jd_parsed_at ? "ok" : "warn"}>
                      {r.is_likely_ghost ? "ghost" : r.jd_parsed_at ? "parsed" : "pending"}
                    </Badge>
                    <span className="pm-num" style={{ fontSize: 11, color: "var(--text-3)", minWidth: 56, textAlign: "right" }}>
                      {timeAgo(r.last_seen_at)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>
      <Pager page={page} pageCount={pageCount} prevHref={jobsPrevHref} nextHref={jobsNextHref} />

      <SectionHeader title="Recent matches" sub={`${matches.length} computed in window`} />

      {/* Verdict chips */}
      {verdictCounts.size > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {[...verdictCounts.entries()].map(([verdict, count]) => (
            <div
              key={verdict}
              style={{
                padding: "6px 12px", borderRadius: 999,
                background: "var(--surface)", border: "1px solid var(--line)",
                fontSize: 13,
              }}
            >
              <span className="pm-num" style={{ fontWeight: 600 }}>{count}</span>{" "}
              <span style={{ color: "var(--text-3)" }}>{verdict}</span>
            </div>
          ))}
        </div>
      )}

      <Card p={0}>
        {matches.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No matches computed yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {matches.map((r, i) => (
              <ListRow
                key={`${r.user_id}-${r.job_id}`}
                divider={i < matches.length - 1}
                title={r.jobs?.title ?? r.job_id.slice(0, 8)}
                subtitle={r.jobs?.companies?.name ?? "Unknown"}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="pm-num" style={{ fontSize: 13, fontWeight: 600 }}>
                      {Math.round(r.score)}
                      {r.confidence != null && (
                        <span style={{ color: "var(--text-3)", fontWeight: 500 }}> / {Math.round(r.confidence)}</span>
                      )}
                    </span>
                    <Badge tone={r.verdict === "strong_fit" ? "ok" : "neutral"}>{r.verdict ?? "scored"}</Badge>
                    <Badge tone={r.user_hidden ? "warn" : "info"}>
                      {r.user_hidden ? "hidden" : "visible"}
                    </Badge>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function QualityChip({ score }: { score: number }) {
  const tone: "ok" | "warn" | "err" =
    score >= 70 ? "ok" : score >= 40 ? "warn" : "err";
  const bg = tone === "ok" ? "var(--ok-soft)" : tone === "warn" ? "var(--warn-soft)" : "var(--err-soft)";
  const fg = tone === "ok" ? "var(--ok)"      : tone === "warn" ? "var(--warn)"      : "var(--err)";
  return (
    <span
      className="pm-num"
      style={{
        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: bg, color: fg,
      }}
    >
      Q{score}
    </span>
  );
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
