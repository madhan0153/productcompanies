import type { Metadata } from "next";
import { Users, Search, UserCheck, FileText, AlertCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, CopyButton, CsvButton, DataGrid, IdentityCell,
  MetricStrip, MiniMetric, MobileRecord, PageHeader, Panel,
  dateShort, resumeStateTone, timeAgo,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = { q?: string };

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  banned_until?: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  current_role: string | null;
  job_title: string | null;
  role_function: string | null;
  target_role_functions: string[] | null;
  resume_storage_path: string | null;
  resume_parse_error: string | null;
  resume_parsing_at: string | null;
  resume_parsed: unknown;
  resume_score: number | null;
  product_dna_score: number | null;
  last_match_compute_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const query  = (params.q ?? "").trim().toLowerCase();

  const admin = createSupabaseAdminClient();

  const [authUsersResult, profilesResult] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin
      .from("profiles")
      .select(
        "id, display_name, current_role, job_title, role_function, target_role_functions," +
        "resume_storage_path, resume_parse_error, resume_parsing_at, resume_parsed," +
        "resume_score, product_dna_score, last_match_compute_at, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500) as any,
  ]);

  const authUsers = (authUsersResult.data?.users ?? []) as AuthUser[];
  const profiles  = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Merge auth + profile data
  const all = authUsers.map((u) => {
    const p = profileById.get(u.id);
    return {
      id:            u.id,
      email:         u.email ?? u.id,
      name:          p?.display_name ?? null,
      role:          p?.role_function ?? p?.current_role ?? p?.job_title ?? "—",
      targetRoles:   p?.target_role_functions ?? [],
      joinedAt:      u.created_at ?? null,
      lastSignInAt:  u.last_sign_in_at ?? null,
      suspended:     Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
      hasResume:     Boolean(p?.resume_storage_path),
      resumeState:   p?.resume_parse_error ? "failed"
        : p?.resume_parsing_at ? "parsing"
        : p?.resume_parsed     ? "parsed"
        : "missing" as "failed" | "parsing" | "parsed" | "missing",
      resumeScore:   p?.resume_score ?? p?.product_dna_score ?? null,
      lastCompute:   p?.last_match_compute_at ?? null,
    };
  });

  const filtered = query
    ? all.filter((u) =>
        [u.email, u.name, u.role].some((v) => v?.toLowerCase().includes(query)),
      )
    : all;

  const suspended  = all.filter((u) => u.suspended).length;
  const withResume = all.filter((u) => u.hasResume).length;
  const parseErrors= all.filter((u) => u.resumeState === "failed").length;

  // CSV export
  const csv = toCsv([
    ["Email", "Name", "Role", "Resume", "Resume score", "Last match compute", "Status"],
    ...filtered.map((u) => [
      u.email, u.name ?? "", u.role,
      u.hasResume ? u.resumeState : "none",
      String(u.resumeScore ?? ""),
      u.lastCompute ?? "",
      u.suspended ? "suspended" : "active",
    ]),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Users"
        title="User Management"
        description="Search, view and monitor all registered users."
        action={<CsvButton filename="prodmatch-users.csv" csv={csv} />}
      />

      {/* Metric strip */}
      <MetricStrip>
        <MiniMetric label="Total users"    value={all.length} />
        <MiniMetric label="With resume"    value={withResume} />
        <MiniMetric label="Suspended"      value={suspended}  tone={suspended > 0 ? "warn" : undefined} />
        <MiniMetric label="Parse errors"   value={parseErrors} tone={parseErrors > 0 ? "danger" : undefined} />
      </MetricStrip>

      {/* Search */}
      <form action="/admin/users" className="mb-4">
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by email, name or role…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </form>

      {/* Users panel */}
      <Panel icon={Users} title={`Users${query ? ` — "${query}"` : ""}`} description={`${filtered.length} of ${all.length} total`}>
        <DataGrid
          columns={["User", "Role", "Resume", "Last compute", "Status", ""]}
          rows={filtered}
          getKey={(r) => r.id}
          empty="No users match the search."
          renderMobile={(r) => (
            <MobileRecord
              title={r.name ?? r.email}
              eyebrow={r.email}
              status={<Badge tone={r.suspended ? "danger" : "ok"}>{r.suspended ? "Suspended" : "Active"}</Badge>}
              meta={[
                ["Role",     r.role],
                ["Resume",   r.hasResume ? r.resumeState : "none"],
                ["Score",    r.resumeScore != null ? String(r.resumeScore) : "—"],
                ["Compute",  timeAgo(r.lastCompute)],
              ]}
              action={<CopyButton id={r.id} />}
            />
          )}
          renderCells={(r) => [
            <IdentityCell key="user"
              title={r.name ?? r.email}
              subtitle={`${r.email} · joined ${dateShort(r.joinedAt)}`}
            />,
            <IdentityCell key="role"
              title={r.role}
              subtitle={r.targetRoles.slice(0, 2).join(", ") || undefined}
            />,
            <Badge key="resume" tone={resumeStateTone(r.resumeState)}>
              {r.resumeState}{r.resumeScore != null ? ` / ${r.resumeScore}` : ""}
            </Badge>,
            <span key="compute" className="text-xs text-muted-foreground">{timeAgo(r.lastCompute)}</span>,
            <Badge key="status" tone={r.suspended ? "danger" : "ok"}>
              {r.suspended ? "Suspended" : "Active"}
            </Badge>,
            <CopyButton key="copy" id={r.id} />,
          ]}
        />
      </Panel>

      {/* Summary cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<UserCheck className="h-5 w-5 text-emerald-500" />}
          title="Matched users"
          value={String(all.filter((u) => u.lastCompute).length)}
          sub="have had match compute run"
        />
        <SummaryCard
          icon={<FileText className="h-5 w-5 text-primary" />}
          title="Resume uploaded"
          value={String(withResume)}
          sub={`${Math.round((withResume / Math.max(1, all.length)) * 100)}% of users`}
        />
        <SummaryCard
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          title="No resume"
          value={String(all.length - withResume)}
          sub="haven't uploaded a resume yet"
        />
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, sub }: {
  icon: React.ReactNode; title: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-elev1">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
}
