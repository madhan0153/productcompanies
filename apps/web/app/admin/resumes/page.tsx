import type { Metadata } from "next";
import { FileText, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, CopyButton, DataGrid, IdentityCell,
  MetricStrip, MiniMetric, MobileRecord, PageHeader, Panel,
  SectionDivider, dateShort, resumeStateTone, timeAgo,
} from "@/components/admin/admin-ui";

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
      .limit(100) as any,
    admin
      .from("resume_intel_events")
      .select("kind, scope, ok, error_kind, latency_ms, created_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(300) as any,
    admin
      .from("enhanced_resumes")
      .select("id, status, created_at, ats_score_before, ats_score_after")
      .order("created_at", { ascending: false })
      .limit(20) as any,
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin
      .from("resume_intel_events")
      .select("kind, ok, latency_ms")
      .gte("created_at", since24h)
      .limit(500) as any,
  ]);

  const profiles     = (profilesResult.data ?? []) as ProfileResume[];
  const intelEvents  = (intelEventsResult.data ?? []) as IntelEvent[];
  const enhanced     = (enhancedResult.data ?? []) as EnhancedRow[];
  const intelLast24h = (intelRecent.data ?? []) as Array<{ kind: string; ok: boolean; latency_ms: number | null }>;

  const ready    = profiles.filter((p) => p.resume_parsed && !p.resume_parse_error);
  const failed   = profiles.filter((p) => p.resume_parse_error);
  const parsing  = profiles.filter((p) => p.resume_parsing_at && !p.resume_parse_error && !p.resume_parsed);

  const diagOk   = intelLast24h.filter((e) => e.kind === "diagnosis" && e.ok).length;
  const diagFail = intelLast24h.filter((e) => e.kind === "diagnosis" && !e.ok).length;
  const diagLat  = pct(intelLast24h.filter((e) => e.kind === "diagnosis").map((e) => e.latency_ms ?? 0), 0.5);

  const errEvents = intelEvents.filter((e) => !e.ok).slice(0, 20);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Resumes"
        title="Resume Management"
        description="View parse state, AI pipeline health, and enhancement history."
      />

      <MetricStrip>
        <MiniMetric label="Uploaded"     value={profiles.length} />
        <MiniMetric label="Parsed"       value={ready.length} />
        <MiniMetric label="Parse errors" value={failed.length}  tone={failed.length > 0 ? "danger" : undefined} />
        <MiniMetric label="AI artifacts" value={(tailoredResult.count ?? 0) + enhanced.length} />
      </MetricStrip>

      {/* Resume list */}
      <Panel icon={FileText} title="All uploaded resumes" description={`${profiles.length} total`}>
        <DataGrid
          columns={["Candidate", "Score", "State", "Updated", "Error"]}
          rows={profiles}
          getKey={(r) => r.id}
          empty="No resumes uploaded yet."
          renderMobile={(r) => (
            <MobileRecord
              title={r.display_name ?? r.id.slice(0, 8)}
              eyebrow={r.current_role ?? r.job_title ?? "No headline"}
              status={
                <Badge tone={
                  r.resume_parse_error ? "danger" :
                  r.resume_parsing_at  ? "warn"   : "ok"
                }>
                  {r.resume_parse_error ? "failed" : r.resume_parsing_at ? "parsing" : "ready"}
                </Badge>
              }
              meta={[
                ["Score",   String(r.resume_score ?? r.product_dna_score ?? "—")],
                ["Updated", dateShort(r.updated_at)],
                ["Error",   r.resume_parse_error?.slice(0, 40) ?? "—"],
              ]}
              action={<CopyButton id={r.id} />}
            />
          )}
          renderCells={(r) => {
            const state = r.resume_parse_error ? "failed" : r.resume_parsing_at ? "parsing" : "parsed";
            return [
              <IdentityCell key="cand"
                title={r.display_name ?? r.id.slice(0, 8)}
                subtitle={r.current_role ?? r.job_title ?? undefined}
              />,
              <span key="score" className="font-semibold tabular-nums">
                {r.resume_score ?? r.product_dna_score ?? "—"}
              </span>,
              <Badge key="state" tone={resumeStateTone(state)}>{state}</Badge>,
              <span key="updated" className="text-xs text-muted-foreground">{dateShort(r.updated_at)}</span>,
              <span key="error" className="block max-w-[18rem] truncate text-xs text-muted-foreground">
                {r.resume_parse_error ?? "—"}
              </span>,
            ];
          }}
        />
      </Panel>

      {/* AI pipeline */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Intel ops */}
        <Panel icon={Sparkles} title="AI pipeline (24h)" description="Diagnoses, rewrites, and renders">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniMetric label="Diagnoses ok"   value={diagOk} />
            <MiniMetric label="Diagnoses fail"  value={diagFail} tone={diagFail > 0 ? "danger" : undefined} />
            <MiniMetric label="p50 latency"     value={`${diagLat}ms`} />
            <MiniMetric label="Enhanced total"  value={enhanced.length} />
            <MiniMetric label="Tailored total"  value={tailoredResult.count ?? 0} />
            <MiniMetric label="Snapshots"       value={snapshotsResult.count ?? 0} />
          </div>
        </Panel>

        {/* Recent errors */}
        <Panel icon={AlertCircle} title="Recent intel errors (7d)" description="Resume intelligence pipeline failures">
          {errEvents.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-400">
              ✓ No errors in the last 7 days.
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background/40">
              {errEvents.map((e, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-xs">
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-500">
                    {e.kind}
                  </span>
                  <span className="truncate text-muted-foreground">{e.error_kind ?? "unknown error"}</span>
                  <span className="shrink-0 text-muted-foreground/60">{timeAgo(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Enhanced resumes */}
      <SectionDivider title="Recent enhanced resumes" />
      <Panel icon={RefreshCw} title="Enhanced resume history" description="Last 20 AI-enhanced resume sessions">
        <DataGrid
          columns={["ID", "Status", "ATS before", "ATS after", "Delta", "Created"]}
          rows={enhanced}
          getKey={(r) => r.id}
          empty="No enhanced resumes yet."
          renderMobile={(r) => (
            <MobileRecord
              title={r.id.slice(0, 12)}
              eyebrow={`ATS: ${r.ats_score_before ?? "—"} → ${r.ats_score_after ?? "—"}`}
              status={<Badge tone={r.status === "finalised" ? "ok" : r.status === "pending_review" ? "warn" : "muted"}>{r.status}</Badge>}
              meta={[
                ["Delta",   delta(r.ats_score_before, r.ats_score_after)],
                ["Created", timeAgo(r.created_at)],
              ]}
            />
          )}
          renderCells={(r) => [
            <code key="id" className="text-xs">{r.id.slice(0, 12)}…</code>,
            <Badge key="status" tone={r.status === "finalised" ? "ok" : r.status === "pending_review" ? "warn" : "muted"}>
              {r.status}
            </Badge>,
            <span key="before" className="tabular-nums">{r.ats_score_before ?? "—"}</span>,
            <span key="after"  className="tabular-nums">{r.ats_score_after ?? "—"}</span>,
            <span key="delta"  className={`text-xs font-medium ${atsDeltaColor(r.ats_score_before, r.ats_score_after)}`}>
              {delta(r.ats_score_before, r.ats_score_after)}
            </span>,
            <span key="when" className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>,
          ]}
        />
      </Panel>
    </div>
  );
}

function pct(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]);
}

function delta(before: number | null, after: number | null): string {
  if (before == null || after == null) return "—";
  const d = after - before;
  return d >= 0 ? `+${d}` : String(d);
}

function atsDeltaColor(before: number | null, after: number | null): string {
  if (before == null || after == null) return "text-muted-foreground";
  return after >= before ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}
