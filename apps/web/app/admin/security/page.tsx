import type { Metadata } from "next";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Security" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BgJob = {
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

type DeadKey = {
  provider_id: string;
  model: string;
  capability: string;
  failure_kind: string;
  dead_until: string;
  detected_at: string;
};

export default async function AdminSecurityPage() {
  const admin    = createSupabaseAdminClient();
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  const [
    bgJobsResult,
    dpdpResult,
    deadKeysResult,
    failedJobsCount,
    activeJobsCount,
    dpdpCount,
  ] = await Promise.all([
    admin
      .from("background_jobs")
      .select("id, user_id, job_type, status, error_code, error_message, queued_at, finished_at")
      .order("queued_at", { ascending: false })
      .limit(50) as never,
    admin
      .from("dpdp_events")
      .select("event, user_id, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(30) as never,
    admin
      .from("llm_dead_keys")
      .select("provider_id, model, capability, failure_kind, dead_until, detected_at")
      .order("detected_at", { ascending: false })
      .limit(20) as never,
    admin.from("background_jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("queued_at", since24h),
    admin.from("background_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
    admin.from("dpdp_events").select("id", { count: "exact", head: true }).gte("created_at", since7d),
  ]);

  const bgJobs   = ((bgJobsResult   as { data: BgJob[]     | null }).data ?? []);
  const dpdp     = ((dpdpResult     as { data: DpdpEvent[] | null }).data ?? []);
  const deadKeys = ((deadKeysResult as { data: DeadKey[]   | null }).data ?? []);

  const failedJobs = bgJobs.filter((j) => j.status === "failed");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Security
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Activity Logs & Security
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Background jobs, DPDP audit trail, and LLM dead-key quarantine.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Failed jobs (24h)" value={String(failedJobsCount.count ?? 0)} accent />
        <KPI label="Active queue"      value={String(activeJobsCount.count ?? 0)} />
        <KPI label="DPDP events (7d)"  value={String(dpdpCount.count ?? 0)} />
        <KPI label="Dead LLM keys"     value={String(deadKeys.length)} hint={deadKeys.length > 0 ? "review" : "clean"} />
      </div>

      {failedJobs.length > 0 && (
        <div style={{
          marginTop: 18, padding: 14, borderRadius: 12,
          background: "var(--err-soft)",
          border: "1px solid color-mix(in oklab, var(--err) 30%, transparent)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <AlertCircle size={18} style={{ color: "var(--err)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--err)" }}>
              {failedJobs.length} background job{failedJobs.length > 1 ? "s" : ""} failed in last 24h
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {failedJobs.map((j) => j.job_type).join(", ")}
            </p>
          </div>
        </div>
      )}

      <SectionHeader title="Background jobs" sub="Last 50 queued jobs" />
      <Card p={0}>
        {bgJobs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No background jobs found.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {bgJobs.map((r, i) => {
              const duration = r.finished_at && r.queued_at
                ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.queued_at).getTime()) / 1000)}s`
                : "—";
              return (
                <ListRow
                  key={r.id}
                  divider={i < bgJobs.length - 1}
                  leading={<JobStatusDot status={r.status} />}
                  title={<span className="pm-mono">{r.job_type}</span>}
                  subtitle={`${r.user_id.slice(0, 10)} · ${duration} · ${r.error_code ?? r.error_message?.slice(0, 60) ?? "—"}`}
                  trailing={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Badge tone={bgJobTone(r.status)}>{r.status}</Badge>
                      <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 56, textAlign: "right" }}>
                        {timeAgo(r.queued_at)}
                      </span>
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>

      <SectionHeader title="DPDP audit trail" sub="Consent, export, and erasure events (last 30)" />
      <Card p={0}>
        {dpdp.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No DPDP events recorded.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {dpdp.map((r, i) => (
              <ListRow
                key={`${r.event}-${r.created_at}`}
                divider={i < dpdp.length - 1}
                title={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Badge tone="neutral">{r.event}</Badge>
                    <span className="pm-mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {r.user_id?.slice(0, 10) ?? "—"}
                    </span>
                  </span>
                }
                subtitle={JSON.stringify(r.metadata ?? {}).slice(0, 120)}
                trailing={
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {timeAgo(r.created_at)}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="LLM dead-key quarantine" sub="Keys that failed and are temporarily blocked" />
      {deadKeys.length === 0 ? (
        <div style={{
          padding: 14, borderRadius: 12,
          background: "var(--ok-soft)",
          border: "1px solid color-mix(in oklab, var(--ok) 30%, transparent)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <CheckCircle2 size={18} style={{ color: "var(--ok)" }} />
          <p style={{ fontSize: 13, color: "var(--ok)", fontWeight: 500 }}>
            No dead keys — all LLM routes healthy.
          </p>
        </div>
      ) : (
        <Card p={0}>
          <div style={{ paddingBottom: 4 }}>
            {deadKeys.map((r, i) => (
              <ListRow
                key={`${r.provider_id}-${r.model}-${r.detected_at}`}
                divider={i < deadKeys.length - 1}
                title={`${r.provider_id} · ${r.model.slice(0, 28)}`}
                subtitle={`${r.capability} · dead until ${timeAgo(r.dead_until)}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Badge tone="err">{r.failure_kind}</Badge>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{timeAgo(r.detected_at)}</span>
                  </span>
                }
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function JobStatusDot({ status }: { status: string }) {
  const tone =
    status === "failed"    ? "var(--err)" :
    status === "succeeded" ? "var(--ok)"  :
    status === "running"   ? "var(--accent)" :
                             "var(--warn)";
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: tone, flexShrink: 0,
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tone} 18%, transparent)`,
    }}/>
  );
}

function bgJobTone(status: string): "ok" | "warn" | "err" | "info" | "neutral" {
  if (status === "failed")    return "err";
  if (status === "succeeded") return "ok";
  if (status === "running")   return "info";
  return "warn";
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "—";
  const m = Math.floor(diff / 60_000);
  if (Math.abs(m) < 1) return "now";
  if (Math.abs(m) < 60) return diff > 0 ? `${m}m` : `in ${-m}m`;
  const h = Math.floor(Math.abs(m) / 60);
  if (h < 24) return diff > 0 ? `${h}h` : `in ${h}h`;
  return diff > 0 ? `${Math.floor(h / 24)}d` : `in ${Math.floor(h / 24)}d`;
}
