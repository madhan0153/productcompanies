import type { Metadata } from "next";
import {
  Mail, Workflow, Trophy, RefreshCw, KeyRound, AlertCircle, Trash2, Sparkles,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PageHeader, MetricStrip, MiniMetric, Badge, timeAgo,
} from "@/components/admin/admin-ui";
import { CronButton, ResetDeadKeyButton, ClearFailedJobsButton } from "./client-buttons";

export const metadata: Metadata = { title: "Admin · Ops Console" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DeadKey {
  id: string;
  provider_id: string;
  model: string;
  capability: string;
  failure_kind: string;
  dead_until: string;
  detected_at: string;
}

interface ActionLog {
  id: string;
  actor_email: string;
  action_type: string;
  target_ref: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default async function AdminOpsPage() {
  const admin = createSupabaseAdminClient();

  const [queuedJobsResult, failedJobsResult, deadKeysResult, recentActionsResult] = await Promise.all([
    admin.from("background_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
    admin.from("background_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin
      .from("llm_dead_keys")
      .select("id, provider_id, model, capability, failure_kind, dead_until, detected_at")
      .order("detected_at", { ascending: false })
      .limit(20) as any,
    admin
      .from("admin_actions")
      .select("id, actor_email, action_type, target_ref, status, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(20) as any,
  ]);

  const deadKeys      = (deadKeysResult.data ?? []) as DeadKey[];
  const recentActions = (recentActionsResult.data ?? []) as ActionLog[];
  const failedCount   = failedJobsResult.count ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Operations"
        title="Ops Console"
        description="One-tap triggers for crons, queues, dead-key resets, and emergency controls. Every action is logged."
      />

      <MetricStrip>
        <MiniMetric label="Queue depth"      value={queuedJobsResult.count ?? 0} tone={(queuedJobsResult.count ?? 0) > 5 ? "warn" : undefined} />
        <MiniMetric label="Failed jobs"      value={failedCount}                 tone={failedCount > 0 ? "danger" : undefined} />
        <MiniMetric label="Dead LLM keys"    value={deadKeys.length}             tone={deadKeys.length > 0 ? "warn" : undefined} />
        <MiniMetric label="Actions today"    value={recentActions.length} />
      </MetricStrip>

      {/* Cron triggers */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Cron triggers</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OpsCard icon={<Mail className="h-5 w-5 text-primary" />} title="Send weekly digest" description="Triggers the digest email for users on the weekly digest schedule.">
            <CronButton cronKey="digest" label="Send digest" />
          </OpsCard>
          <OpsCard icon={<Workflow className="h-5 w-5 text-violet-500" />} title="Drain background jobs" description="Process queued resume parses, JD parses, and match computes immediately.">
            <CronButton cronKey="drain_jobs" label="Drain queue" />
          </OpsCard>
          <OpsCard icon={<Trophy className="h-5 w-5 text-emerald-500" />} title="Recompute matches" description="Refresh all user-job match scores against the current job pool.">
            <CronButton cronKey="recompute_matches" label="Recompute" />
          </OpsCard>
          <OpsCard icon={<Sparkles className="h-5 w-5 text-amber-500" />} title="IndexNow ping" description="Notify search engines of recently updated URLs via the IndexNow protocol.">
            <CronButton cronKey="indexnow" label="Ping IndexNow" />
          </OpsCard>
        </div>
      </section>

      {/* Queue / dead keys */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
                <RefreshCw className="h-4 w-4 text-rose-500" />
              </span>
              <p className="text-sm font-semibold">Failed jobs</p>
            </div>
            <ClearFailedJobsButton failedCount={failedCount} />
          </div>
          <p className="text-sm text-muted-foreground">
            {failedCount > 0
              ? `${failedCount} background job${failedCount === 1 ? "" : "s"} in failed state. Inspect on the Security page, or clear once you have triaged.`
              : "No failed background jobs. Queue is clean."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
              <KeyRound className="h-4 w-4 text-amber-500" />
            </span>
            <p className="text-sm font-semibold">Quarantined LLM keys</p>
          </div>
          {deadKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dead keys — all LLM routes healthy.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {deadKeys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{k.provider_id} · {k.model}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {k.capability} · {k.failure_kind} · until {timeAgo(k.dead_until)}
                    </p>
                  </div>
                  <ResetDeadKeyButton id={k.id} label={`${k.provider_id}/${k.model}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Audit log */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </span>
          <h2 className="text-sm font-semibold">Recent admin actions</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          {recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions logged yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {recentActions.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.action_type.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.actor_email} · {a.target_ref ?? "—"} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                  <Badge tone={a.status === "success" ? "green" : "danger"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function OpsCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60">
        {icon}
      </div>
      <p className="mb-1 font-semibold">{title}</p>
      <p className="mb-4 text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
