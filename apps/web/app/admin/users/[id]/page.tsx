import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Calendar, ShieldAlert, Coins, CreditCard, FileText, RefreshCw, Trash2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  PageHeader, Badge, timeAgo, dateShort,
} from "@/components/admin/admin-ui";
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
      .eq("user_id", id) as any,
  ]);

  const user = authResp?.user;
  if (!user) notFound();

  // Sum credits per kind
  const creditsByKind = new Map<string, number>();
  for (const row of (creditsResult.data ?? []) as Array<{ kind: string; amount: number }>) {
    creditsByKind.set(row.kind, (creditsByKind.get(row.kind) ?? 0) + row.amount);
  }

  const isSuspended = !!profile?.suspended_at;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Users
      </Link>

      <PageHeader
        eyebrow={user.email ?? id}
        title={profile?.display_name ?? user.email ?? "User"}
        description={`Joined ${dateShort(user.created_at)}${profile?.role_function ? ` · ${profile.role_function}` : ""}${isSuspended ? " · SUSPENDED" : ""}`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="muted"><Mail className="mr-1 inline h-3 w-3" />{user.email}</Badge>
        <Badge tone="muted"><Calendar className="mr-1 inline h-3 w-3" />{dateShort(user.created_at)}</Badge>
        {profile?.role_function && <Badge tone="blue">{profile.role_function}</Badge>}
        {isSuspended && <Badge tone="danger">Suspended</Badge>}
      </div>

      {/* Suspension banner */}
      {isSuspended && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/8 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Suspended {timeAgo(profile!.suspended_at!)}</p>
            <p className="text-xs text-muted-foreground">Reason: {profile?.suspension_reason ?? "—"}</p>
          </div>
          <UnsuspendButton userId={user.id} />
        </div>
      )}

      {/* Entitlement summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Plan"            value={entitlement?.plan ?? "free"}     tone={entitlement?.plan === "career_sprint" ? "violet" : entitlement?.plan === "pro" ? "blue" : undefined} />
        <Tile label="Tailor credits"  value={String(creditsByKind.get("tailored_resume") ?? 0)} />
        <Tile label="Reparse credits" value={String(creditsByKind.get("resume_reparse") ?? 0)} />
        <Tile label="Active until"    value={entitlement?.active_until ? dateShort(entitlement.active_until) : "—"} />
      </div>

      {/* Action panel — quick row */}
      <div className="mb-6 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Resume management</p>
          </div>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Storage path</dt>
              <dd className="font-mono">{profile?.resume_storage_path ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Parse error</dt>
              <dd className={profile?.resume_parse_error ? "text-rose-500" : ""}>{profile?.resume_parse_error?.slice(0, 60) ?? "none"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Resume score</dt>
              <dd className="font-semibold">{profile?.resume_score ?? profile?.product_dna_score ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last match</dt>
              <dd>{profile?.last_match_compute_at ? timeAgo(profile.last_match_compute_at) : "never"}</dd>
            </div>
          </dl>
          <ReparseButton userId={user.id} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <p className="text-sm font-semibold">Account actions</p>
          </div>
          {!isSuspended ? (
            <SuspendForm userId={user.id} />
          ) : (
            <p className="text-xs text-muted-foreground">User is already suspended. Use the banner above to unsuspend.</p>
          )}
          <div className="my-3 border-t border-border" />
          <DeleteUserDialog userId={user.id} email={user.email ?? "user"} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Delete is permanent — runs DPDP-compliant erasure of all owned data, then removes the auth user.
          </p>
        </div>
      </div>

      {/* Grants */}
      <Section title="Entitlement grants" icon={<Coins className="h-4 w-4 text-amber-500" />}>
        {(!grants || grants.length === 0) ? (
          <p className="text-sm text-muted-foreground">No grants on this user.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {grants.map((g) => {
              const isRevoked = !!g.revoked_at;
              const isExpired = g.expires_at && new Date(g.expires_at) < new Date();
              return (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{g.plan ?? g.grant_type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.source} · {g.reason ?? "no reason"} · {timeAgo(g.created_at)}
                      {g.expires_at && ` · expires ${dateShort(g.expires_at)}`}
                    </p>
                  </div>
                  <Badge tone={isRevoked ? "muted" : isExpired ? "warn" : "green"}>
                    {isRevoked ? "revoked" : isExpired ? "expired" : "active"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Subscriptions */}
      <Section title="Subscriptions" icon={<CreditCard className="h-4 w-4 text-emerald-500" />}>
        {(!subscriptions || subscriptions.length === 0) ? (
          <p className="text-sm text-muted-foreground">No subscriptions on this user.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.plan} ({s.provider})</p>
                  <p className="text-[11px] text-muted-foreground">
                    Renews {s.current_period_end ? dateShort(s.current_period_end) : "—"} · created {timeAgo(s.created_at)}
                  </p>
                </div>
                <Badge tone={s.status === "active" ? "green" : s.status === "cancelled" ? "muted" : "warn"}>{s.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Invoices */}
      <Section title="Recent invoices" icon={<CreditCard className="h-4 w-4 text-violet-500" />}>
        {(!invoices || invoices.length === 0) ? (
          <p className="text-sm text-muted-foreground">No invoices on this user.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">₹{(inv.amount / 100).toLocaleString("en-IN")} {inv.currency}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(inv.created_at)}</p>
                </div>
                <span className="flex items-center gap-2">
                  <Badge tone={inv.status === "paid" ? "green" : "danger"}>{inv.status}</Badge>
                  {inv.hosted_invoice_url && (
                    <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recent matches */}
      <Section title="Recent matches" icon={<RefreshCw className="h-4 w-4 text-primary" />}>
        {(!matches || matches.length === 0) ? (
          <p className="text-sm text-muted-foreground">No matches yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-medium">Score {Math.round(m.score)}</span>
                <Badge tone={m.verdict === "strong_fit" ? "green" : m.verdict === "stretch" ? "blue" : "muted"}>{m.verdict ?? "—"}</Badge>
                <span className="text-muted-foreground">{timeAgo(m.computed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "blue" | "violet" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "blue" ? "border-primary/30 bg-primary/5" : tone === "violet" ? "border-violet-500/30 bg-violet-500/5" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-5 shadow-elev1">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </section>
  );
}
