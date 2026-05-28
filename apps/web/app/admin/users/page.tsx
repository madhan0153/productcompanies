import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, FileText, UserCheck } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Avatar, Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

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

type ResumeState = "failed" | "parsing" | "parsed" | "missing";

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
      .limit(500) as never,
  ]);

  const authUsers = (authUsersResult.data?.users ?? []) as AuthUser[];
  const profiles  = ((profilesResult as { data: ProfileRow[] | null }).data ?? []);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const all = authUsers.map((u) => {
    const p = profileById.get(u.id);
    const resumeState: ResumeState = p?.resume_parse_error ? "failed"
      : p?.resume_parsing_at ? "parsing"
      : p?.resume_parsed     ? "parsed"
      : "missing";
    return {
      id:           u.id,
      email:        u.email ?? u.id,
      name:         p?.display_name ?? null,
      role:         p?.role_function ?? p?.current_role ?? p?.job_title ?? "—",
      targetRoles:  p?.target_role_functions ?? [],
      joinedAt:     u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      suspended:    Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
      hasResume:    Boolean(p?.resume_storage_path),
      resumeState,
      resumeScore:  p?.resume_score ?? p?.product_dna_score ?? null,
      lastCompute:  p?.last_match_compute_at ?? null,
    };
  });

  const filtered = query
    ? all.filter((u) =>
        [u.email, u.name, u.role].some((v) => v?.toLowerCase().includes(query)),
      )
    : all;

  const suspended   = all.filter((u) => u.suspended).length;
  const withResume  = all.filter((u) => u.hasResume).length;
  const parseErrors = all.filter((u) => u.resumeState === "failed").length;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Users
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          User Management
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Search, view, and monitor every signed-up account.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Total users"   value={all.length.toLocaleString("en-IN")} accent />
        <KPI label="With resume"   value={withResume.toLocaleString("en-IN")} hint={`${Math.round((withResume / Math.max(1, all.length)) * 100)}%`} />
        <KPI label="Suspended"     value={String(suspended)}    hint={suspended > 0 ? "review" : "clean"} />
        <KPI label="Parse errors"  value={String(parseErrors)}  hint={parseErrors > 0 ? "look at /admin/resumes" : "all healthy"} />
      </div>

      {/* Search */}
      <form action="/admin/users" style={{ marginTop: 22, marginBottom: 14, maxWidth: 480 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          height: 38, background: "var(--surface-2)", borderRadius: 10,
          border: "1px solid transparent",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-3)" }}>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by email, name or role…"
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontFamily: "inherit", fontSize: 14, color: "var(--text)", minWidth: 0,
            }}
          />
        </div>
      </form>

      <SectionHeader
        title={query ? `Users matching "${query}"` : "All users"}
        sub={`${filtered.length} of ${all.length} accounts`}
      />
      <Card p={0}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No users match the search.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {filtered.slice(0, 200).map((u, i) => (
              <ListRow
                key={u.id}
                href={`/admin/users/${u.id}`}
                divider={i < Math.min(filtered.length, 200) - 1}
                leading={<Avatar name={u.name ?? u.email} tone={hashHue(u.id)} size={32} />}
                title={u.name ?? u.email}
                subtitle={`${u.email} · ${u.role}`}
                meta={
                  u.suspended
                    ? <Badge tone="err" size="sm">suspended</Badge>
                    : u.resumeState === "failed"
                      ? <Badge tone="warn" size="sm">parse failed</Badge>
                      : undefined
                }
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={resumeToneFor(u.resumeState)}>
                      {u.resumeState}
                      {u.resumeScore != null ? ` · ${u.resumeScore}` : ""}
                    </Badge>
                    <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 56, textAlign: "right" }}>
                      {timeAgo(u.lastCompute)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
        {filtered.length > 200 && (
          <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
            Showing first 200 of {filtered.length}. Refine the search to narrow.
          </div>
        )}
      </Card>

      <SectionHeader title="At a glance" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <SummaryTile
          icon={<UserCheck size={16} style={{ color: "var(--ok)" }} />}
          title="Matched users"
          value={all.filter((u) => u.lastCompute).length}
          sub="had a match compute run"
        />
        <SummaryTile
          icon={<FileText size={16} style={{ color: "var(--accent)" }} />}
          title="Resume uploaded"
          value={withResume}
          sub={`${Math.round((withResume / Math.max(1, all.length)) * 100)}% of users`}
        />
        <SummaryTile
          icon={<AlertCircle size={16} style={{ color: "var(--warn)" }} />}
          title="No resume yet"
          value={all.length - withResume}
          sub="haven't uploaded a resume"
        />
      </div>
    </div>
  );
}

function SummaryTile({
  icon, title, value, sub,
}: { icon: React.ReactNode; title: string; value: number; sub: string }) {
  return (
    <Card p={16}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        {icon}
      </div>
      <div className="pm-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
        {value.toLocaleString("en-IN")}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

// Deterministic hue for avatar — same id always gets same colour
function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function resumeToneFor(state: ResumeState): "ok" | "warn" | "err" | "neutral" {
  if (state === "parsed")  return "ok";
  if (state === "parsing") return "warn";
  if (state === "failed")  return "err";
  return "neutral";
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "now";
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
