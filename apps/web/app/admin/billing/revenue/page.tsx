import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, ChevronRight, Gift, RefreshCw,
  Users as UsersIcon, Wallet,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, Card, KPI, ListRow, SectionHeader, Spark, StatusDot,
} from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Revenue & Retention" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SubRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
}

interface InvoiceRow {
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface RefundRow {
  amount: number | null;
  requested_at: string;
}

export default async function AdminRevenuePage() {
  const admin    = createSupabaseAdminClient();
  const now      = Date.now();
  const since30d = new Date(now - 30 * 86_400_000).toISOString();
  const since60d = new Date(now - 60 * 86_400_000).toISOString();

  const [
    subsAllResult,
    paidThis30dResult,
    paidPrev30dResult,
    refunds30dResult,
    cancelledThis30dResult,
    activeSubsCountResult,
  ] = await Promise.all([
    admin.from("subscriptions")
      .select("id, user_id, plan, status, current_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(500) as never,
    admin.from("invoices")
      .select("amount, currency, status, created_at")
      .gte("created_at", since30d).eq("status", "paid") as never,
    admin.from("invoices")
      .select("amount, currency, status, created_at")
      .gte("created_at", since60d).lt("created_at", since30d).eq("status", "paid") as never,
    admin.from("refunds")
      .select("amount, requested_at")
      .gte("requested_at", since30d) as never,
    admin.from("subscriptions")
      .select("id", { count: "exact", head: true })
      .gte("cancelled_at", since30d) as never,
    admin.from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]) as never,
  ]);

  const subs         = ((subsAllResult as { data: SubRow[] | null }).data ?? []);
  const paidThis30d  = ((paidThis30dResult as { data: InvoiceRow[] | null }).data ?? [])
                          .reduce((s, r) => s + (r.amount ?? 0), 0);
  const paidPrev30d  = ((paidPrev30dResult as { data: InvoiceRow[] | null }).data ?? [])
                          .reduce((s, r) => s + (r.amount ?? 0), 0);
  const refunds30d   = ((refunds30dResult as { data: RefundRow[] | null }).data ?? [])
                          .reduce((s, r) => s + (r.amount ?? 0), 0);
  const cancelled30d = (cancelledThis30dResult as { count: number | null }).count ?? 0;
  const activeSubs   = (activeSubsCountResult as { count: number | null }).count ?? 0;

  const mrr           = paidThis30d;
  const arr           = mrr * 12;
  const netRevenue30d = paidThis30d - refunds30d;
  const mrrDelta      = paidThis30d - paidPrev30d;
  const mrrDeltaPct   = paidPrev30d > 0
    ? Math.round(((paidThis30d - paidPrev30d) / paidPrev30d) * 1000) / 10
    : null;
  const churnRate     = activeSubs > 0
    ? Math.round((cancelled30d / activeSubs) * 1000) / 10
    : 0;

  // Build a 30-day MRR pulse from invoice timestamps (one bucket per day)
  const mrrPulse = buildDailyTotals(
    ((paidThis30dResult as { data: InvoiceRow[] | null }).data ?? []),
    30,
  );

  const planMix = new Map<string, { count: number; revenue: number }>();
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    const entry = planMix.get(sub.plan) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    planMix.set(sub.plan, entry);
  }

  const recentSubs = subs
    .filter((s) => new Date(s.created_at).getTime() > now - 7 * 86_400_000)
    .slice(0, 8);

  const userIds = Array.from(new Set(recentSubs.map((s) => s.user_id))).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

  const atRisk = subs.filter((s) => s.status === "past_due" || s.status === "on_hold").slice(0, 6);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <Link
        href="/admin/billing"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--text-3)", marginBottom: 12,
        }}
      >
        <ArrowLeft size={12} /> Back to Billing
      </Link>

      {/* Hero */}
      <header style={{ marginBottom: 18 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.14em", color: "var(--accent)",
        }}>
          Admin · Revenue
        </p>
        <h1 style={{
          marginTop: 6, fontSize: 28, fontWeight: 600,
          letterSpacing: -0.9, color: "var(--text)",
        }}>
          <span className="pm-num">₹{(mrr / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
          <span style={{ color: "var(--text-3)", fontSize: 16, fontWeight: 500, marginLeft: 10, letterSpacing: -0.2 }}>
            MRR · ₹{(arr / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} ARR
          </span>
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          {mrrDeltaPct !== null
            ? `${mrrDelta >= 0 ? "+" : ""}₹${(Math.abs(mrrDelta) / 100).toLocaleString("en-IN")} vs prior 30d · ${mrrDeltaPct > 0 ? "+" : ""}${mrrDeltaPct}% MoM`
            : "First 30-day window — comparison kicks in next month."}
        </p>
      </header>

      {/* KPI strip */}
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      }}>
        <KPI
          label="MRR (30d)"
          value={`₹${(mrr / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          delta={mrrDeltaPct !== null ? `${mrrDeltaPct > 0 ? "+" : ""}${mrrDeltaPct}%` : undefined}
          hint="From paid invoices"
          accent
        />
        <KPI
          label="Active subs"
          value={activeSubs.toLocaleString("en-IN")}
          hint={`${cancelled30d} cancelled in 30d`}
        />
        <KPI
          label="Churn (30d)"
          value={`${churnRate}%`}
          delta={churnRate <= 5 ? "+ healthy" : "− watch"}
          hint={cancelled30d === 0 ? "Zero cancellations" : `${cancelled30d} cancellations`}
        />
        <KPI
          label="Net revenue"
          value={`₹${(netRevenue30d / 100).toLocaleString("en-IN")}`}
          hint={`${refunds30d > 0 ? `−₹${(refunds30d / 100).toLocaleString("en-IN")} refunds` : "No refunds"}`}
        />
      </div>

      {/* MRR pulse */}
      <SectionHeader title="MRR pulse" sub="Paid revenue across the last 30 days" />
      <Card p={18}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div className="pm-num" style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.9 }}>
              ₹{(mrr / 100).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Across {activeSubs} active subscriptions
            </div>
          </div>
          <Badge tone={mrrDelta >= 0 ? "ok" : "warn"}>
            {mrrDelta >= 0 ? "On plan" : "Below prior"}
          </Badge>
        </div>
        <Spark data={mrrPulse.length > 0 ? mrrPulse : [0, 0, 0, 0]} h={60} style={{ marginTop: 8 }} />
      </Card>

      {/* By plan + Net revenue breakdown */}
      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
      }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Net revenue · 30d</div>
          <BreakdownRow label="Gross paid" value={paidThis30d} tone="ok" />
          <BreakdownRow label="Refunds"    value={-refunds30d} tone={refunds30d > 0 ? "err" : "neutral"} />
          <div style={{ height: 1, background: "var(--line-2)", margin: "8px 0" }} />
          <BreakdownRow label="Net"        value={netRevenue30d} bold />
        </Card>

        <Card p={0}>
          <SectionHeader title="By plan" sub="Active subscriptions only" />
          {planMix.size === 0 ? (
            <div style={{ padding: "0 16px 16px", color: "var(--text-3)", fontSize: 13 }}>
              No active subscriptions yet.
            </div>
          ) : (
            <div style={{ paddingBottom: 8 }}>
              {[...planMix.entries()].sort((a, b) => b[1].count - a[1].count).map(([plan, info], i, arr) => {
                const share = activeSubs > 0 ? Math.round((info.count / activeSubs) * 100) : 0;
                const label = plan === "career_sprint" ? "Career Sprint" : plan === "pro" ? "Pro" : plan;
                return (
                  <div key={plan} style={{
                    padding: "12px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line-2)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                      <span className="pm-num" style={{ fontSize: 12, color: "var(--text-3)" }}>
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{info.count}</span> subs · {share}%
                      </span>
                    </div>
                    <div style={{
                      position: "relative", height: 6, borderRadius: 999,
                      background: "var(--surface-2)", overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", inset: "0 auto 0 0",
                        width: `${share}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-strong))",
                        borderRadius: 999,
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent payers + At risk */}
      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}>
        <Card p={0}>
          <SectionHeader
            title="New paying users (7d)"
            sub={`${recentSubs.length} signed in for a plan`}
            action={<Badge tone="ok">{recentSubs.length}</Badge>}
          />
          {recentSubs.length === 0 ? (
            <div style={{ padding: "0 16px 16px", color: "var(--text-3)", fontSize: 13 }}>
              Nobody upgraded this week.
            </div>
          ) : (
            <div style={{ paddingBottom: 4 }}>
              {recentSubs.map((s, i) => {
                const email = emailMap.get(s.user_id) ?? s.user_id.slice(0, 12);
                return (
                  <ListRow
                    key={s.id}
                    href={`/admin/users/${s.user_id}`}
                    divider={i < recentSubs.length - 1}
                    title={<span className="pm-mono">{email}</span>}
                    subtitle={timeAgo(s.created_at)}
                    trailing={<Badge tone={s.plan === "career_sprint" ? "accent" : "info"}>{s.plan}</Badge>}
                  />
                );
              })}
            </div>
          )}
        </Card>

        <Card p={0}>
          <SectionHeader
            title="At-risk subscribers"
            sub="past_due or on_hold"
            action={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <StatusDot tone={atRisk.length > 0 ? "warn" : "ok"} live={atRisk.length > 0} />
                <Badge tone={atRisk.length > 0 ? "warn" : "ok"}>{atRisk.length}</Badge>
              </span>
            }
          />
          {atRisk.length === 0 ? (
            <div style={{ padding: "0 16px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} style={{ color: "var(--ok)" }} />
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                Nothing past-due or on hold. Clean book.
              </span>
            </div>
          ) : (
            <div style={{ paddingBottom: 4 }}>
              {atRisk.map((s, i) => (
                <ListRow
                  key={s.id}
                  href={`/admin/users/${s.user_id}`}
                  divider={i < atRisk.length - 1}
                  title={<span className="pm-mono">{emailMap.get(s.user_id) ?? s.user_id.slice(0, 12)}</span>}
                  subtitle={timeAgo(s.created_at)}
                  trailing={<Badge tone={s.status === "past_due" ? "err" : "warn"}>{s.status}</Badge>}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Footer actions */}
      <SectionHeader title="Quick actions" />
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}>
        <ActionTile href="/admin/billing/coupons"       icon={<Gift size={16} style={{ color: "var(--accent)" }} />}      title="Coupons"      desc="Create access codes & promos." />
        <ActionTile href="/admin/billing/grants"        icon={<UsersIcon size={16} style={{ color: "var(--accent)" }} />} title="Grant access" desc="Give Pro / Sprint manually." />
        <ActionTile href="/admin/billing/subscriptions" icon={<RefreshCw size={16} style={{ color: "var(--accent)" }} />} title="Subscriptions" desc="Live state + invoices." />
        <ActionTile href="/admin/billing/reconcile"     icon={<Wallet size={16} style={{ color: "var(--accent)" }} />}    title="Reconcile"    desc="Force-sync from Dodo." />
      </div>
    </div>
  );
}

// ─── server-only sub-components ──────────────────────────────────────────────

function BreakdownRow({
  label, value, tone, bold,
}: { label: string; value: number; tone?: "ok" | "err" | "neutral"; bold?: boolean }) {
  const negative = value < 0;
  const colour =
    bold              ? "var(--text)" :
    tone === "ok"     ? "var(--ok)"   :
    tone === "err" || negative ? "var(--err)" :
                        "var(--text)";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", fontSize: 13,
      fontWeight: bold ? 600 : 400,
    }}>
      <span style={{ color: bold ? "var(--text)" : "var(--text-2)" }}>{label}</span>
      <span className="pm-num" style={{ color: colour }}>
        {value < 0 ? "−" : ""}₹{(Math.abs(value) / 100).toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function ActionTile({
  href, icon, title, desc,
}: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} style={{ display: "block" }}>
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
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{desc}</div>
        <div style={{
          marginTop: 10, fontSize: 12, fontWeight: 500,
          color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          Open <ChevronRight size={12} />
        </div>
      </Card>
    </Link>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildDailyTotals(invoices: InvoiceRow[], days: number): number[] {
  const buckets = new Array<number>(days).fill(0);
  const now = Date.now();
  for (const inv of invoices) {
    const t = new Date(inv.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    const ageDays = Math.floor((now - t) / 86_400_000);
    if (ageDays < 0 || ageDays >= days) continue;
    buckets[days - 1 - ageDays] += inv.amount ?? 0;
  }
  return buckets;
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
