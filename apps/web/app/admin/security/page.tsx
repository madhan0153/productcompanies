import type { Metadata } from "next";
import { ShieldAlert, RefreshCw, LockKeyhole, AlertCircle, CheckCircle2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, DataGrid, IdentityCell, MetricStrip, MiniMetric,
  MobileRecord, PageHeader, Panel, SectionDivider, timeAgo,
} from "@/components/admin/admin-ui";

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
      .limit(50) as any,
    admin
      .from("dpdp_events")
      .select("event, user_id, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(30) as any,
    admin
      .from("llm_dead_keys")
      .select("provider_id, model, capability, failure_kind, dead_until, detected_at")
      .order("detected_at", { ascending: false })
      .limit(20) as any,
    admin.from("background_jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("queued_at", since24h),
    admin.from("background_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
    admin.from("dpdp_events").select("id", { count: "exact", head: true }).gte("created_at", since7d),
  ]);

  const bgJobs   = (bgJobsResult.data   ?? []) as BgJob[];
  const dpdp     = (dpdpResult.data     ?? []) as DpdpEvent[];
  const deadKeys = (deadKeysResult.data ?? []) as DeadKey[];

  const failedJobs = bgJobs.filter((j) => j.status === "failed");
  const activeJobs = bgJobs.filter((j) => j.status === "queued" || j.status === "running");

  function bgJobTone(status: string) {
    if (status === "failed")    return "danger" as const;
    if (status === "succeeded") return "ok"     as const;
    if (status === "running")   return "blue"   as const;
    return "warn" as const;
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Security"
        title="Activity Logs & Security"
        description="Background jobs, DPDP audit trail, and LLM dead-key quarantine."
      />

      <MetricStrip>
        <MiniMetric label="Failed jobs (24h)"  value={failedJobsCount.count ?? 0} tone={(failedJobsCount.count ?? 0) > 0 ? "danger" : undefined} />
        <MiniMetric label="Active queue"        value={activeJobsCount.count ?? 0} tone={(activeJobsCount.count ?? 0) > 0 ? "warn" : undefined} />
        <MiniMetric label="DPDP events (7d)"   value={dpdpCount.count ?? 0} />
        <MiniMetric label="Dead LLM keys"       value={deadKeys.length} tone={deadKeys.length > 0 ? "warn" : undefined} />
      </MetricStrip>

      {/* Alert banner for failures */}
      {failedJobs.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/8 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
              {failedJobs.length} background job{failedJobs.length > 1 ? "s" : ""} failed in last 24h
            </p>
            <p className="text-xs text-muted-foreground">
              {failedJobs.map((j) => j.job_type).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Background jobs */}
      <Panel icon={RefreshCw} title="Background jobs" description="Last 50 queued jobs">
        <DataGrid
          columns={["Type", "Status", "User", "Queued", "Duration", "Error"]}
          rows={bgJobs}
          getKey={(r) => r.id}
          empty="No background jobs found."
          renderMobile={(r) => (
            <MobileRecord
              title={r.job_type}
              eyebrow={r.user_id.slice(0, 10)}
              status={<Badge tone={bgJobTone(r.status)}>{r.status}</Badge>}
              meta={[
                ["Queued",    timeAgo(r.queued_at)],
                ["Error",     r.error_code ?? r.error_message?.slice(0, 30) ?? "—"],
              ]}
            />
          )}
          renderCells={(r) => {
            const duration = r.finished_at && r.queued_at
              ? `${Math.round((new Date(r.finished_at).getTime() - new Date(r.queued_at).getTime()) / 1000)}s`
              : "—";
            return [
              <span key="type" className="font-mono text-xs">{r.job_type}</span>,
              <Badge key="status" tone={bgJobTone(r.status)}>{r.status}</Badge>,
              <code key="user" className="text-xs">{r.user_id.slice(0, 10)}</code>,
              <span key="queued" className="text-xs text-muted-foreground">{timeAgo(r.queued_at)}</span>,
              <span key="dur"   className="text-xs tabular-nums">{duration}</span>,
              <span key="error" className="block max-w-[16rem] truncate text-xs text-muted-foreground">
                {r.error_code ?? r.error_message?.slice(0, 60) ?? "—"}
              </span>,
            ];
          }}
        />
      </Panel>

      <SectionDivider title="DPDP audit trail" />

      {/* DPDP events */}
      <Panel icon={LockKeyhole} title="DPDP events" description="Consent, export, and erasure events (last 30)">
        <DataGrid
          columns={["Event", "User", "When", "Metadata"]}
          rows={dpdp}
          getKey={(r) => `${r.event}-${r.created_at}`}
          empty="No DPDP events recorded."
          renderMobile={(r) => (
            <MobileRecord
              title={r.event}
              eyebrow={r.user_id?.slice(0, 10) ?? "system"}
              status={<Badge tone="muted">Audit</Badge>}
              meta={[
                ["When",     timeAgo(r.created_at)],
                ["Metadata", JSON.stringify(r.metadata ?? {}).slice(0, 50)],
              ]}
            />
          )}
          renderCells={(r) => [
            <Badge key="event" tone="muted">{r.event}</Badge>,
            <code key="user" className="text-xs">{r.user_id?.slice(0, 10) ?? "—"}</code>,
            <span key="when" className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>,
            <span key="meta" className="block max-w-[20rem] truncate text-xs text-muted-foreground">
              {JSON.stringify(r.metadata ?? {}).slice(0, 120)}
            </span>,
          ]}
        />
      </Panel>

      <SectionDivider title="LLM dead-key quarantine" />

      {/* Dead keys */}
      <Panel icon={ShieldAlert} title="Quarantined LLM keys" description="Keys that failed and are temporarily blocked">
        {deadKeys.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400">No dead keys — all LLM routes healthy.</p>
          </div>
        ) : (
          <DataGrid
            columns={["Provider", "Model", "Capability", "Failure", "Dead until", "Detected"]}
            rows={deadKeys}
            getKey={(r) => `${r.provider_id}-${r.model}-${r.detected_at}`}
            empty="No dead keys."
            renderMobile={(r) => (
              <MobileRecord
                title={r.provider_id}
                eyebrow={r.model}
                status={<Badge tone="danger">{r.failure_kind}</Badge>}
                meta={[
                  ["Capability", r.capability],
                  ["Dead until", timeAgo(r.dead_until)],
                ]}
              />
            )}
            renderCells={(r) => [
              <IdentityCell key="prov"  title={r.provider_id} subtitle={r.model} />,
              <code key="model" className="text-xs">{r.model.slice(0, 28)}</code>,
              <Badge key="cap"      tone="muted">{r.capability}</Badge>,
              <Badge key="failure"  tone="danger">{r.failure_kind}</Badge>,
              <span key="until" className="text-xs text-muted-foreground">{timeAgo(r.dead_until)}</span>,
              <span key="det"   className="text-xs text-muted-foreground">{timeAgo(r.detected_at)}</span>,
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
