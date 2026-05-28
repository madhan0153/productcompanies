import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, Stethoscope, TrendingUp, Users, Wallet } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

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
    admin.from("invoices").select("amount").gte("created_at", since30d).eq("status", "paid") as never,
    admin.from("entitlement_grants").select("id", { count: "exact", head: true }).is("revoked_at", null),
    admin.from("promo_codes").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("invoices")
      .select("amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10) as never,
  ]);

  const revenue30d = ((paidInvoicesResult as { data: Array<{ amount: number }> | null }).data ?? [])
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  const recentInvoices = ((recentInvoicesResult as {
    data: Array<{ amount: number; currency: string; status: string; created_at: string }> | null;
  }).data) ?? [];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Billing
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8, color: "var(--text)" }}>
          Billing Control Center
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Grant access, push coupon codes, manage subscriptions, reconcile payments — without leaving the admin.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Active subs"    value={String(activeSubsResult.count   ?? 0)} accent />
        <KPI label="Active grants"  value={String(activeGrantsResult.count ?? 0)} />
        <KPI label="Active promos"  value={String(activePromosResult.count ?? 0)} />
        <KPI
          label="Revenue (30d)"
          value={`₹${(revenue30d / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          hint="Paid invoices"
        />
      </div>

      <SectionHeader title="Quick actions" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <ActionTile
          href="/admin/billing/revenue"
          icon={<TrendingUp size={16} style={{ color: "var(--accent)" }} />}
          title="Revenue & retention"
          desc="MRR, churn, at-risk list, plan mix."
        />
        <ActionTile
          href="/admin/billing/grants"
          icon={<Users size={16} style={{ color: "var(--accent)" }} />}
          title="Grant access"
          desc="Give Pro / Career Sprint by email."
        />
        <ActionTile
          href="/admin/billing/coupons"
          icon={<Gift size={16} style={{ color: "var(--accent)" }} />}
          title="Coupons"
          desc="Create promo codes with discount + cap."
        />
        <ActionTile
          href="/admin/billing/subscriptions"
          icon={<Wallet size={16} style={{ color: "var(--accent)" }} />}
          title="Subscriptions"
          desc="Live state, cancel, refund."
        />
        <ActionTile
          href="/admin/billing/reconcile"
          icon={<Stethoscope size={16} style={{ color: "var(--accent)" }} />}
          title="Reconcile payment"
          desc="Force-sync a sub_… from Dodo."
        />
      </div>

      <SectionHeader
        title="Recent invoices"
        action={
          <Link
            href="/admin/billing/subscriptions"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-3)" }}
          >
            View all <ArrowRight size={12} />
          </Link>
        }
      />
      <Card p={0}>
        {recentInvoices.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: "var(--text-3)" }}>
            No invoices yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {recentInvoices.map((inv, i) => (
              <ListRow
                key={i}
                divider={i < recentInvoices.length - 1}
                title={
                  <span style={{ color: "var(--text-2)", fontSize: 13 }}>
                    {new Date(inv.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                }
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={inv.status === "paid" ? "ok" : "err"}>{inv.status}</Badge>
                    <span className="pm-num" style={{ fontWeight: 600 }}>
                      {(inv.currency ?? "INR") === "INR" ? "₹" : inv.currency}
                      {(inv.amount / 100).toLocaleString("en-IN")}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>
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
          Open <ArrowRight size={12} />
        </div>
      </Card>
    </Link>
  );
}
