import type { Metadata } from "next";
import Link from "next/link";
import { Gift, KeyRound, Wallet, Users, ArrowRight, TrendingUp, Stethoscope } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MetricStrip, MiniMetric, PageHeader,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Billing" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminBillingPage() {
  const admin    = createSupabaseAdminClient();
  const since30d = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();

  const [
    activeSubsResult,
    paidInvoicesResult,
    activeGrantsResult,
    activePromosResult,
    recentInvoicesResult,
  ] = await Promise.all([
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("invoices").select("amount").gte("created_at", since30d).eq("status", "paid") as any,
    admin.from("entitlement_grants").select("id", { count: "exact", head: true }).is("revoked_at", null),
    admin.from("promo_codes").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("invoices")
      .select("amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10) as any,
  ]);

  const revenue30d = ((paidInvoicesResult.data ?? []) as Array<{ amount: number }>)
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Billing"
        title="Billing Control Center"
        description="Grant access, create promo codes, manage subscriptions, and refund payments — all without leaving the admin."
      />

      <MetricStrip>
        <MiniMetric label="Active subs"        value={activeSubsResult.count ?? 0} />
        <MiniMetric label="Active grants"      value={activeGrantsResult.count ?? 0} />
        <MiniMetric label="Active promos"      value={activePromosResult.count ?? 0} />
        <MiniMetric label="Revenue (30d)"      value={`₹${(revenue30d / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
      </MetricStrip>

      {/* Action cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href="/admin/billing/revenue"
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          title="Revenue & retention"
          description="MRR, churn, at-risk list, plan mix — the whole money picture in one screen."
        />
        <ActionCard
          href="/admin/billing/grants"
          icon={<Users className="h-5 w-5 text-primary" />}
          title="Grant access"
          description="Give Pro / Career Sprint to any user by email. Lifetime, 12-month, or custom duration."
        />
        <ActionCard
          href="/admin/billing/coupons"
          icon={<Gift className="h-5 w-5 text-violet-500" />}
          title="Coupons"
          description="Create promo codes / coupons with custom discounts, expiry, and redemption caps."
        />
        <ActionCard
          href="/admin/billing/subscriptions"
          icon={<Wallet className="h-5 w-5 text-amber-500" />}
          title="Subscriptions"
          description="View active subs, cancel, or trigger refunds via Dodo Payments."
        />
        <ActionCard
          href="/admin/billing/reconcile"
          icon={<Stethoscope className="h-5 w-5 text-rose-500" />}
          title="Reconcile payment"
          description="User paid but plan didn't activate? Paste their subscription_id and force-sync from Dodo."
        />
      </div>

      {/* Recent invoices peek */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Recent invoices</p>
          <Link href="/admin/billing/subscriptions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {((recentInvoicesResult.data ?? []) as Array<{ amount: number; currency: string; status: string; created_at: string }>).length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {((recentInvoicesResult.data ?? []) as Array<{ amount: number; currency: string; status: string; created_at: string }>).map((inv, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("en-IN")}</span>
                <span className="flex items-center gap-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${inv.status === "paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                    {inv.status}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {(inv.currency ?? "INR") === "INR" ? "₹" : inv.currency} {(inv.amount / 100).toLocaleString("en-IN")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  href, icon, title, description,
}: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-5 shadow-elev1 transition-all hover:border-primary/40 hover:shadow-pop"
    >
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60">
        {icon}
      </div>
      <p className="mb-1 font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </p>
    </Link>
  );
}
