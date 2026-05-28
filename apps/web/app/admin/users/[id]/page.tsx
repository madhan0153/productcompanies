import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Calendar, Coins, CreditCard, FileText, Mail, RefreshCw, ShieldAlert,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Avatar, Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";
import { SuspendForm, DeleteUserDialog, ReparseButton, UnsuspendButton } from "./client-actions";

export const metadata: Metadata = { title: "Admin · User detail" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const admin  = createSupabaseAdminClient();

  const [
    { data: authResp },
    { data: profile },
    { data: entitlement },
    { data: grants },
    { data: subscriptions },
    { data: invoices },
    { data: matches },
    creditsResult,
  ] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("profiles")
      .select("id, display_name, role_function, suspended_at, suspension_reason, resume_storage_path, resume_parse_error, product_dna_score, resume_score, last_match_compute_at, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    admin.from("user_entitlements")
      .select("plan, source, active_until, tailored_resume_limit, refreshed_at")
      .eq("user_id", id)
      .maybeSingle(),
    admin.from("entitlement_grants")
      .select("id, grant_type, plan, expires_at, source, reason, revoked_at, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("subscriptions")
      .select("id, plan, status, current_period_end, provider, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    admin.from("invoices")
      .select("id, amount, currency, status, hosted_invoice_url, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin.from("matches")
      .select("id, verdict, score, computed_at")
      .eq("user_id", id)
      .order("computed_at", { ascending: false })
      .limit(5),
    admin.from("credit_ledger")
      .select("kind, amount")
      .eq("user_id", id) as never,
  ]);

  const user = authResp?.user;
  if (!user) notFound();

  const creditsByKind = new Map<string, number>();
  for (const row of (((creditsResult as { data: Array<{ kind: string; amount: number }> | null }).data) ?? [])) {
    creditsByKind.set(row.kind, (creditsByKind.get(row.kind) ?? 0) + row.amount);
  }

  const isSuspended = !!profile?.suspended_at;
  const tone = hashHue(user.id);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 96px" }}>
      <Link
        href="/admin/users"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}
      >
        <ArrowLeft size={12} /> Back to Users
      </Link>

      {/* Hero */}
      <Card>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar name={profile?.display_name ?? user.email ?? "?"} tone={tone} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
              {user.email ?? id}
            </p>
            <h1 style={{ marginTop: 4, fontSize: 22, fontWeight: 600, letterSpacing: -0.6 }}>
              {profile?.display_name ?? user.email ?? "User"}
            </h1>
            <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
              Joined {dateShort(user.created_at)}
              {profile?.role_function ? ` · ${profile.role_function}` : ""}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Badge tone="neutral"><Mail size={11} style={{ marginRight: 4 }} />{user.email}</Badge>
          <Badge tone="neutral"><Calendar size={11} style={{ marginRight: 4 }} />{dateShort(user.created_at)}</Badge>
          {profile?.role_function && <Badge tone="info">{profile.role_function}</Badge>}
          {isSuspended && <Badge tone="err">Suspended</Badge>}
        </div>
      </Card>

      {isSuspended && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          background: "var(--err-soft)",
          border: "1px solid color-mix(in oklab, var(--err) 30%, transparent)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <ShieldAlert size={18} style={{ color: "var(--err)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--err)" }}>
              Suspended {timeAgo(profile!.suspended_at!)}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              Reason: {profile?.suspension_reason ?? "—"}
            </p>
          </div>
          <UnsuspendButton userId={user.id} />
        </div>
      )}

      <SectionHeader title="Entitlement" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Plan"            value={entitlement?.plan ?? "free"} accent={entitlement?.plan != null && entitlement.plan !== "free"} />
        <KPI label="Tailor credits"  value={String(creditsByKind.get("tailored_resume") ?? 0)} />
        <KPI label="Reparse credits" value={String(creditsByKind.get("resume_reparse") ?? 0)} />
        <KPI label="Active until"    value={entitlement?.active_until ? dateShort(entitlement.active_until) : "—"} />
      </div>

      <SectionHeader title="Actions" />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <FileText size={16} style={{ color: "var(--accent)" }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Resume management</p>
          </div>
          <dl style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            columnGap: 12, rowGap: 10, marginBottom: 14, fontSize: 12,
          }}>
            <Detail label="Storage path" value={profile?.resume_storage_path ?? "—"} mono />
            <Detail label="Parse error"  value={profile?.resume_parse_error?.slice(0, 60) ?? "none"} tone={profile?.resume_parse_error ? "err" : undefined} />
            <Detail label="Resume score" value={String(profile?.resume_score ?? profile?.product_dna_score ?? "—")} />
            <Detail label="Last match"   value={profile?.last_match_compute_at ? timeAgo(profile.last_match_compute_at) : "never"} />
          </dl>
          <ReparseButton userId={user.id} />
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ShieldAlert size={16} style={{ color: "var(--err)" }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Account actions</p>
          </div>
          {!isSuspended ? (
            <SuspendForm userId={user.id} />
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>User is already suspended. Use the banner above to unsuspend.</p>
          )}
          <div style={{ margin: "12px 0", borderTop: "1px solid var(--line-2)" }} />
          <DeleteUserDialog userId={user.id} email={user.email ?? "user"} />
          <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
            Delete is permanent — runs DPDP-compliant erasure of all owned data, then removes the auth user.
          </p>
        </Card>
      </div>

      <SectionHeader title="Entitlement grants" sub={(grants?.length ?? 0).toString() + " on file"} />
      <Card p={0}>
        {(!grants || grants.length === 0) ? (
          <div style={{ padding: 18, fontSize: 13, color: "var(--text-3)" }}>No grants on this user.</div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {grants.map((g, i) => {
              const isRevoked = !!g.revoked_at;
              const isExpired = g.expires_at && new Date(g.expires_at) < new Date();
              return (
                <ListRow
                  key={g.id}
                  divider={i < grants.length - 1}
                  leading={<Coins size={14} style={{ color: "var(--warn)" }} />}
                  title={g.plan ?? g.grant_type}
                  subtitle={`${g.source} · ${g.reason ?? "no reason"} · ${timeAgo(g.created_at)}${g.expires_at ? ` · expires ${dateShort(g.expires_at)}` : ""}`}
                  trailing={
                    <Badge tone={isRevoked ? "neutral" : isExpired ? "warn" : "ok"}>
                      {isRevoked ? "revoked" : isExpired ? "expired" : "active"}
                    </Badge>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>

      <SectionHeader title="Subscriptions" sub={(subscriptions?.length ?? 0).toString() + " on file"} />
      <Card p={0}>
        {(!subscriptions || subscriptions.length === 0) ? (
          <div style={{ padding: 18, fontSize: 13, color: "var(--text-3)" }}>No subscriptions on this user.</div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {subscriptions.map((s, i) => (
              <ListRow
                key={s.id}
                divider={i < subscriptions.length - 1}
                leading={<CreditCard size={14} style={{ color: "var(--ok)" }} />}
                title={`${s.plan} (${s.provider})`}
                subtitle={`Renews ${s.current_period_end ? dateShort(s.current_period_end) : "—"} · created ${timeAgo(s.created_at)}`}
                trailing={<Badge tone={s.status === "active" ? "ok" : s.status === "cancelled" ? "neutral" : "warn"}>{s.status}</Badge>}
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Recent invoices" />
      <Card p={0}>
        {(!invoices || invoices.length === 0) ? (
          <div style={{ padding: 18, fontSize: 13, color: "var(--text-3)" }}>No invoices on this user.</div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {invoices.map((inv, i) => (
              <ListRow
                key={inv.id}
                divider={i < invoices.length - 1}
                leading={<CreditCard size={14} style={{ color: "var(--accent)" }} />}
                title={
                  <span className="pm-num" style={{ fontWeight: 600 }}>
                    ₹{(inv.amount / 100).toLocaleString("en-IN")} {inv.currency}
                  </span>
                }
                subtitle={timeAgo(inv.created_at)}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={inv.status === "paid" ? "ok" : "err"}>{inv.status}</Badge>
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>Open</a>
                    )}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Recent matches" />
      <Card p={0}>
        {(!matches || matches.length === 0) ? (
          <div style={{ padding: 18, fontSize: 13, color: "var(--text-3)" }}>No matches yet.</div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {matches.map((m, i) => (
              <ListRow
                key={m.id}
                divider={i < matches.length - 1}
                leading={<RefreshCw size={14} style={{ color: "var(--accent)" }} />}
                title={<span className="pm-num">Score {Math.round(m.score)}</span>}
                subtitle={timeAgo(m.computed_at)}
                trailing={<Badge tone={m.verdict === "strong_fit" ? "ok" : m.verdict === "stretch" ? "info" : "neutral"}>{m.verdict ?? "—"}</Badge>}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: "err" }) {
  return (
    <div>
      <dt style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</dt>
      <dd style={{
        fontSize: mono ? 11 : 12,
        color: tone === "err" ? "var(--err)" : "var(--text)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</dd>
    </div>
  );
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function dateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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
