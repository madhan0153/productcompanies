import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Resumes" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfileResume = {
  id: string;
  display_name: string | null;
  current_role: string | null;
  job_title: string | null;
  resume_storage_path: string | null;
  resume_parse_error: string | null;
  resume_parsing_at: string | null;
  resume_parsed: unknown;
  resume_score: number | null;
  product_dna_score: number | null;
  updated_at: string;
};

type IntelEvent = {
  kind: string;
  scope: string;
  ok: boolean;
  error_kind: string | null;
  latency_ms: number | null;
  created_at: string;
};

type EnhancedRow = {
  id: string;
  status: string;
  created_at: string;
  ats_score_before: number | null;
  ats_score_after: number | null;
};

export default async function AdminResumesPage() {
  const admin    = createSupabaseAdminClient();
  const since7d  = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [
    profilesResult,
    intelEventsResult,
    enhancedResult,
    tailoredResult,
    snapshotsResult,
    intelRecent,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, display_name, current_role, job_title, resume_storage_path," +
        "resume_parse_error, resume_parsing_at, resume_parsed, resume_score," +
        "product_dna_score, updated_at",
      )
      .not("resume_storage_path", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100) as never,
    admin
      .from("resume_intel_events")
      .select("kind, scope, ok, error_kind, latency_ms, created_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(300) as never,
    admin
      .from("enhanced_resumes")
      .select("id, status, created_at, ats_score_before, ats_score_after")
      .order("created_at", { ascending: false })
      .limit(20) as never,
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin
      .from("resume_intel_events")
      .select("kind, ok, latency_ms")
      .gte("created_at", since24h)
      .limit(500) as never,
  ]);

  const profiles    = ((profilesResult    as { data: ProfileResume[] | null }).data ?? []);
  const intelEvents = ((intelEventsResult as { data: IntelEvent[]    | null }).data ?? []);
  const enhanced    = ((enhancedResult    as { data: EnhancedRow[]   | null }).data ?? []);
  const intelLast24h = ((intelRecent      as { data: Array<{ kind: string; ok: boolean; latency_ms: number | null }> | null }).data ?? []);

  const ready   = profiles.filter((p) => p.resume_parsed && !p.resume_parse_error);
  const failed  = profiles.filter((p) => p.resume_parse_error);

  const diagOk   = intelLast24h.filter((e) => e.kind === "diagnosis" && e.ok).length;
  const diagFail = intelLast24h.filter((e) => e.kind === "diagnosis" && !e.ok).length;
  const diagLat  = pct(intelLast24h.filter((e) => e.kind === "diagnosis").map((e) => e.latency_ms ?? 0), 0.5);

  const errEvents = intelEvents.filter((e) => !e.ok).slice(0, 20);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Resumes
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Resume Management
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Parse state, AI pipeline health, and enhancement history.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Uploaded"      value={profiles.length.toLocaleString("en-IN")} accent />
        <KPI label="Parsed"        value={ready.length.toLocaleString("en-IN")}    hint={`${Math.round((ready.length / Math.max(1, profiles.length)) * 100)}%`} />
        <KPI label="Parse errors"  value={String(failed.length)} hint={failed.length > 0 ? "investigate" : "healthy"} />
        <KPI label="AI artifacts"  value={((tailoredResult.count ?? 0) + enhanced.length).toLocaleString("en-IN")} />
      </div>

      <SectionHeader title="Uploaded resumes" sub={`${profiles.length} total — most recent first`} />
      <Card p={0}>
        {profiles.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No resumes uploaded yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {profiles.slice(0, 60).map((r, i) => {
              const state: "parsed" | "parsing" | "failed" = r.resume_parse_error
                ? "failed" : r.resume_parsing_at ? "parsing" : "parsed";
              const score = r.resume_score ?? r.product_dna_score;
              return (
                <ListRow
                  key={r.id}
                  divider={i < Math.min(profiles.length, 60) - 1}
                  href={`/admin/users/${r.id}`}
                  title={r.display_name ?? r.id.slice(0, 12)}
                  subtitle={r.current_role ?? r.job_title ?? (r.resume_parse_error ? `Error: ${r.resume_parse_error.slice(0, 80)}` : "—")}
                  trailing={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      {score != null && (
                        <span className="pm-num" style={{ fontSize: 13, fontWeight: 600 }}>{score}</span>
                      )}
                      <Badge tone={state === "parsed" ? "ok" : state === "parsing" ? "warn" : "err"}>{state}</Badge>
                      <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 56, textAlign: "right" }}>
                        {timeAgo(r.updated_at)}
                      </span>
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>

      {/* AI pipeline */}
      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>AI pipeline · 24h</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Stat label="Diagnoses ok"   value={diagOk}   />
            <Stat label="Diagnoses fail" value={diagFail} tone={diagFail > 0 ? "err" : undefined} />
            <Stat label="p50 latency"    value={`${diagLat}ms`} />
            <Stat label="Enhanced"       value={enhanced.length} />
            <Stat label="Tailored"       value={tailoredResult.count ?? 0} />
            <Stat label="Snapshots"      value={snapshotsResult.count ?? 0} />
          </div>
        </Card>

        <Card p={0}>
          <SectionHeader title="Recent intel errors (7d)" />
          {errEvents.length === 0 ? (
            <div style={{
              margin: "0 16px 16px", padding: "10px 12px", borderRadius: 8,
              background: "var(--ok-soft)", color: "var(--ok)",
              fontSize: 13, fontWeight: 500,
            }}>
              No errors in the last 7 days.
            </div>
          ) : (
            <div style={{ paddingBottom: 4 }}>
              {errEvents.map((e, i) => (
                <ListRow
                  key={i}
                  divider={i < errEvents.length - 1}
                  dense
                  leading={
                    <span style={{
                      padding: "2px 6px", borderRadius: 6,
                      background: "var(--err-soft)", color: "var(--err)",
                      fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)",
                    }}>{e.kind}</span>
                  }
                  title={
                    <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 400 }}>
                      {e.error_kind ?? "unknown error"}
                    </span>
                  }
                  trailing={
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {timeAgo(e.created_at)}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <SectionHeader title="Enhanced resumes" sub="Last 20 AI-enhanced sessions" />
      <Card p={0}>
        {enhanced.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No enhanced resumes yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {enhanced.map((r, i) => (
              <ListRow
                key={r.id}
                divider={i < enhanced.length - 1}
                title={<span className="pm-mono">{r.id.slice(0, 12)}…</span>}
                subtitle={`ATS ${r.ats_score_before ?? "—"} → ${r.ats_score_after ?? "—"} · ${timeAgo(r.created_at)}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="pm-num" style={{
                      fontSize: 13, fontWeight: 600,
                      color: atsDeltaColour(r.ats_score_before, r.ats_score_after),
                    }}>
                      {atsDelta(r.ats_score_before, r.ats_score_after)}
                    </span>
                    <Badge tone={r.status === "finalised" ? "ok" : r.status === "pending_review" ? "warn" : "neutral"}>
                      {r.status}
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

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "err" }) {
  return (
    <div style={{
      padding: 10, borderRadius: 10,
      background: "var(--surface-2)",
    }}>
      <div className="pm-num" style={{
        fontSize: 18, fontWeight: 600, letterSpacing: -0.4,
        color: tone === "err" ? "var(--err)" : "var(--text)",
      }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function pct(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]);
}

function atsDelta(before: number | null, after: number | null): string {
  if (before == null || after == null) return "—";
  const d = after - before;
  return d >= 0 ? `+${d}` : String(d);
}

function atsDeltaColour(before: number | null, after: number | null): string {
  if (before == null || after == null) return "var(--text-3)";
  return after >= before ? "var(--ok)" : "var(--err)";
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
