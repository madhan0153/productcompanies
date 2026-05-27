import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Users, AlertCircle, ArrowLeft, ArrowUpRight,
  Wallet, Repeat, UserMinus, Gift, RefreshCw, ChevronRight,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, timeAgo } from "@/components/admin/admin-ui";

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
  created_at: string;
}

export default async function AdminRevenuePage() {
  const admin = createSupabaseAdminClient();
  const now   = Date.now();
  const since30d = new Date(now - 30 * 86_400_000).toISOString();
  const since60d = new Date(now - 60 * 86_400_000).toISOString();
  const since7d  = new Date(now - 7  * 86_400_000).toISOString();

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
      .limit(500) as any,
    admin.from("invoices")
      .select("amount, currency, status, created_at")
      .gte("created_at", since30d).eq("status", "paid") as any,
    admin.from("invoices")
      .select("amount, currency, status, created_at")
      .gte("created_at", since60d).lt("created_at", since30d).eq("status", "paid") as any,
    admin.from("refunds")
      .select("amount, created_at")
      .gte("created_at", since30d) as any,
    admin.from("subscriptions")
      .select("id", { count: "exact", head: true })
      .gte("cancelled_at", since30d) as any,
    admin.from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]) as any,
  ]);

  const subs            = (subsAllResult.data ?? []) as SubRow[];
  const paidThis30d     = ((paidThis30dResult.data ?? []) as InvoiceRow[])
                            .reduce((s, r) => s + (r.amount ?? 0), 0);
  const paidPrev30d     = ((paidPrev30dResult.data ?? []) as InvoiceRow[])
                            .reduce((s, r) => s + (r.amount ?? 0), 0);
  const refunds30d      = ((refunds30dResult.data ?? []) as RefundRow[])
                            .reduce((s, r) => s + (r.amount ?? 0), 0);
  const cancelled30d    = cancelledThis30dResult.count ?? 0;
  const activeSubs      = activeSubsCountResult.count ?? 0;

  // MRR approximation: sum of active monthly subs (use invoices paid in last 30d)
  const mrr = paidThis30d;
  const arr = mrr * 12;
  const netRevenue30d = paidThis30d - refunds30d;
  const mrrDelta = paidThis30d - paidPrev30d;
  const mrrDeltaPct = paidPrev30d > 0
    ? Math.round(((paidThis30d - paidPrev30d) / paidPrev30d) * 1000) / 10
    : null;
  const churnRate = activeSubs > 0
    ? Math.round((cancelled30d / activeSubs) * 1000) / 10
    : 0;

  // Subscription mix by plan
  const planMix = new Map<string, { count: number; revenue: number }>();
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    const entry = planMix.get(sub.plan) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    planMix.set(sub.plan, entry);
  }

  // Recent paying users (last 7d)
  const recentSubs = subs
    .filter((s) => new Date(s.created_at).getTime() > now - 7 * 86_400_000)
    .slice(0, 8);

  // Fetch emails for recent subs
  const userIds = Array.from(new Set(recentSubs.map((s) => s.user_id))).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

  // At-risk: cancellations pending or past_due
  const atRisk = subs.filter((s) => s.status === "past_due" || s.status === "on_hold").slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Revenue"
        title="Revenue & Retention"
        description="MRR, churn, and the at-risk list — your money in one screen."
      />

      {/* ── Hero KPI grid ─────────────────────────────────────────────────── */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          icon={<Wallet className="h-4 w-4" />}
          label="MRR (30d)"
          value={`₹${(mrr / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub={mrrDeltaPct !== null
            ? `${mrrDelta >= 0 ? "+" : ""}${(mrrDelta / 100).toLocaleString("en-IN")} vs prior 30d (${mrrDeltaPct > 0 ? "+" : ""}${mrrDeltaPct}%)`
            : "First period"}
          tone={mrrDelta >= 0 ? "ok" : "warn"}
          accent
        />
        <KPI
          icon={<TrendingUp className="h-4 w-4" />}
          label="ARR (projected)"
          value={`₹${(arr / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          sub="MRR × 12"
        />
        <KPI
          icon={<Users className="h-4 w-4" />}
          label="Active subs"
          value={String(activeSubs)}
          sub={`${cancelled30d} cancelled in 30d`}
        />
        <KPI
          icon={<UserMinus className="h-4 w-4" />}
          label="Churn (30d)"
          value={`${churnRate}%`}
          sub={cancelled30d === 0 ? "Zero churn 🎉" : `${cancelled30d} cancellations`}
          tone={churnRate > 5 ? "warn" : "ok"}
        />
      </section>

      {/* ── Net revenue + Plan mix row ────────────────────────────────────── */}
      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Net revenue card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Net revenue (30d)</p>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-3xl font-bold tabular-nums">
            ₹{(netRevenue30d / 100).toLocaleString("en-IN")}
          </p>
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="Gross paid"       value={`₹${(paidThis30d / 100).toLocaleString("en-IN")}`} positive />
            <Row label="Refunds"          value={`−₹${(refunds30d / 100).toLocaleString("en-IN")}`} negative={refunds30d > 0} />
            <div className="my-1 border-t border-border" />
            <Row label="Net"              value={`₹${(netRevenue30d / 100).toLocaleString("en-IN")}`} bold />
          </div>
        </div>

        {/* Plan mix */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Revenue by plan</p>
            <Link href="/admin/billing/subscriptions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              All subs <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {planMix.size === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
          ) : (
            <ul className="space-y-3">
              {[...planMix.entries()].sort((a, b) => b[1].count - a[1].count).map(([plan, info]) => {
                const share = activeSubs > 0 ? Math.round((info.count / activeSubs) * 100) : 0;
                const planLabel = plan === "career_sprint" ? "Career Sprint" : plan === "pro" ? "Pro" : plan;
                return (
                  <li key={plan}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${plan === "career_sprint" ? "bg-violet-500" : "bg-primary"}`} />
                        <span className="font-medium">{planLabel}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{info.count}</span> subs · {share}%
                      </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${plan === "career_sprint" ? "bg-violet-500" : "bg-primary"}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Recent paying users + At-risk ─────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent payers */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">New paying users (7d)</p>
            <Badge tone="green">{recentSubs.length}</Badge>
          </div>
          {recentSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new subscriptions in the last 7 days.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {recentSubs.map((s) => {
                const email = emailMap.get(s.user_id) ?? s.user_id.slice(0, 12);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <Link href={`/admin/users/${s.user_id}`} className="min-w-0 flex-1 truncate font-mono text-xs hover:text-primary">
                      {email}
                    </Link>
                    <Badge tone={s.plan === "career_sprint" ? "violet" : "blue"}>{s.plan}</Badge>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(s.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* At-risk */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold">At-risk subscribers</p>
            </div>
            <Badge tone={atRisk.length > 0 ? "warn" : "ok"}>{atRisk.length}</Badge>
          </div>
          {atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing past-due or on hold. Clean book ✨
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {atRisk.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <Link href={`/admin/users/${s.user_id}`} className="min-w-0 flex-1 truncate font-mono text-xs hover:text-primary">
                    {emailMap.get(s.user_id) ?? s.user_id.slice(0, 12)}
                  </Link>
                  <Badge tone={s.status === "past_due" ? "danger" : "warn"}>{s.status}</Badge>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/admin/billing/coupons" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-secondary">
          <Gift className="h-3.5 w-3.5" /> New coupon
        </Link>
        <Link href="/admin/billing/subscriptions" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> View all subs
        </Link>
        <Link href="/admin/billing/grants" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-secondary">
          <Users className="h-3.5 w-3.5" /> Grant access
        </Link>
      </div>
    </div>
  );
}

function KPI({
  icon, label, value, sub, tone, accent,
}: {
  icon:   React.ReactNode;
  label:  string;
  value:  string;
  sub:    string;
  tone?:  "ok" | "warn";
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-elev1 ${
      accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${accent ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {icon}
          </span>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        {tone === "warn"
          ? <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
          : tone === "ok"
            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            : null}
      </div>
      <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Row({ label, value, positive, negative, bold }: {
  label:    string;
  value:    string;
  positive?: boolean;
  negative?: boolean;
  bold?:    boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-muted-foreground ${bold ? "font-semibold text-foreground" : ""}`}>{label}</span>
      <span className={`tabular-nums ${
        bold ? "font-bold text-foreground"
          : negative ? "text-rose-600 dark:text-rose-400"
          : positive ? "text-emerald-600 dark:text-emerald-400"
          : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  );
}
