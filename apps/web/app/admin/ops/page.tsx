import type { Metadata } from "next";
import { AlertCircle, KeyRound, Mail, RefreshCw, Sparkles, Trophy, Workflow } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";
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
      .limit(20) as never,
    admin
      .from("admin_actions")
      .select("id, actor_email, action_type, target_ref, status, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(20) as never,
  ]);

  const deadKeys      = ((deadKeysResult      as { data: DeadKey[]   | null }).data ?? []);
  const recentActions = ((recentActionsResult as { data: ActionLog[] | null }).data ?? []);
  const failedCount   = failedJobsResult.count ?? 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Operations
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Ops Console
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          One-tap triggers for crons, queues, dead-key resets, and emergency controls. Every action is logged.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Queue depth"   value={String(queuedJobsResult.count ?? 0)} accent />
        <KPI label="Failed jobs"   value={String(failedCount)} hint={failedCount > 0 ? "investigate" : "clean"} />
        <KPI label="Dead LLM keys" value={String(deadKeys.length)} hint={deadKeys.length > 0 ? "review" : "healthy"} />
        <KPI label="Recent actions" value={String(recentActions.length)} hint="last 20" />
      </div>

      <SectionHeader title="Cron triggers" sub="One-tap, audit-logged" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <OpsTile icon={<Mail size={16} style={{ color: "var(--accent)" }} />}     title="Send weekly digest" desc="Triggers the digest email for users on the weekly schedule." action={<CronButton cronKey="digest"           label="Send digest" />} />
        <OpsTile icon={<Workflow size={16} style={{ color: "var(--accent)" }} />} title="Drain background jobs" desc="Process queued parses, JD parses, match computes immediately." action={<CronButton cronKey="drain_jobs"       label="Drain queue" />} />
        <OpsTile icon={<Trophy size={16} style={{ color: "var(--accent)" }} />}   title="Recompute matches" desc="Refresh all user-job match scores against the current pool." action={<CronButton cronKey="recompute_matches" label="Recompute" />} />
        <OpsTile icon={<Sparkles size={16} style={{ color: "var(--accent)" }} />} title="IndexNow ping" desc="Notify search engines of recently updated URLs." action={<CronButton cronKey="indexnow"         label="Ping IndexNow" />} />
      </div>

      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={16} style={{ color: "var(--err)" }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Failed jobs</p>
            </div>
            <ClearFailedJobsButton failedCount={failedCount} />
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            {failedCount > 0
              ? `${failedCount} background job${failedCount === 1 ? "" : "s"} in failed state. Inspect on the Security page, or clear once triaged.`
              : "No failed background jobs. Queue is clean."}
          </p>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <KeyRound size={16} style={{ color: "var(--warn)" }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Quarantined LLM keys</p>
          </div>
          {deadKeys.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No dead keys — all LLM routes healthy.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deadKeys.map((k) => (
                <div
                  key={k.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {k.provider_id} · {k.model}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {k.capability} · {k.failure_kind} · until {timeAgo(k.dead_until)}
                    </p>
                  </div>
                  <ResetDeadKeyButton id={k.id} label={`${k.provider_id}/${k.model}`} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SectionHeader
        title="Recent admin actions"
        action={<span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}><AlertCircle size={12} /> audit log</span>}
      />
      <Card p={0}>
        {recentActions.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No admin actions logged yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {recentActions.map((a, i) => (
              <ListRow
                key={a.id}
                divider={i < recentActions.length - 1}
                title={a.action_type.replace(/_/g, " ")}
                subtitle={`${a.actor_email} · ${a.target_ref ?? "—"} · ${timeAgo(a.created_at)}`}
                trailing={<Badge tone={a.status === "success" ? "ok" : "err"}>{a.status}</Badge>}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function OpsTile({
  icon, title, desc, action,
}: { icon: React.ReactNode; title: string; desc: string; action: React.ReactNode }) {
  return (
    <Card p={16}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "var(--accent-soft)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 12 }}>{desc}</div>
      {action}
    </Card>
  );
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
