import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, DataGrid, MobileRecord, timeAgo } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Subscriptions" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SubRow {
  id: string;
  user_id: string;
  provider: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  user_id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
}

export default async function AdminSubscriptionsPage() {
  const admin = createSupabaseAdminClient();

  const [subsResult, invoicesResult, refundsResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, user_id, provider, plan, status, current_period_end, cancel_at_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(100) as any,
    admin
      .from("invoices")
      .select("id, user_id, provider, amount, currency, status, receipt_url, hosted_invoice_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100) as any,
    admin
      .from("refunds")
      .select("id, user_id, amount, status, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20) as any,
  ]);

  const subs     = (subsResult.data ?? []) as SubRow[];
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];

  // Fetch emails
  const userIds = Array.from(new Set([...subs.map((s) => s.user_id), ...invoices.map((i) => i.user_id)])).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Billing"
        title="Subscriptions & Invoices"
        description="Live subscription state and recent invoices. To refund, open the receipt in your Dodo dashboard (one-click admin refund coming soon)."
      />

      {/* Subscriptions */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-elev1">
        <p className="mb-3 text-sm font-semibold">Subscriptions ({subs.length})</p>
        <DataGrid
          columns={["User", "Plan", "Status", "Renews", "Provider", "Created"]}
          rows={subs}
          getKey={(r) => r.id}
          empty="No subscriptions yet."
          renderMobile={(r) => (
            <MobileRecord
              title={emailMap.get(r.user_id) ?? r.user_id.slice(0, 12)}
              eyebrow={r.plan}
              status={<Badge tone={r.status === "active" ? "green" : "warn"}>{r.status}</Badge>}
              meta={[
                ["Renews", r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("en-IN") : "—"],
                ["Provider", r.provider],
              ]}
            />
          )}
          renderCells={(r) => [
            <Link key="user" href={`/admin/users/${r.user_id}`} className="font-mono text-xs hover:text-primary">{emailMap.get(r.user_id) ?? r.user_id.slice(0, 12)}</Link>,
            <Badge key="plan" tone={r.plan === "career_sprint" ? "violet" : "blue"}>{r.plan}</Badge>,
            <Badge key="status" tone={r.status === "active" ? "green" : r.status === "cancelled" ? "muted" : "warn"}>{r.status}</Badge>,
            <span key="renews" className="text-xs text-muted-foreground">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("en-IN") : "—"}{r.cancel_at_period_end ? " (cancel pending)" : ""}</span>,
            <span key="prov" className="text-xs">{r.provider}</span>,
            <span key="cr" className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>,
          ]}
        />
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
        <p className="mb-3 text-sm font-semibold">Recent invoices ({invoices.length})</p>
        <DataGrid
          columns={["User", "Amount", "Status", "When", "Receipt"]}
          rows={invoices}
          getKey={(r) => r.id}
          empty="No invoices yet."
          renderMobile={(r) => (
            <MobileRecord
              title={emailMap.get(r.user_id) ?? r.user_id.slice(0, 12)}
              eyebrow={`₹${(r.amount / 100).toLocaleString("en-IN")}`}
              status={<Badge tone={r.status === "paid" ? "green" : "danger"}>{r.status}</Badge>}
              meta={[["When", timeAgo(r.created_at)]]}
            />
          )}
          renderCells={(r) => [
            <Link key="u" href={`/admin/users/${r.user_id}`} className="font-mono text-xs hover:text-primary">{emailMap.get(r.user_id) ?? r.user_id.slice(0, 12)}</Link>,
            <span key="amt" className="font-semibold tabular-nums">₹{(r.amount / 100).toLocaleString("en-IN")}</span>,
            <Badge key="st" tone={r.status === "paid" ? "green" : "danger"}>{r.status}</Badge>,
            <span key="when" className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>,
            r.hosted_invoice_url || r.receipt_url ? (
              <a key="link" href={(r.hosted_invoice_url ?? r.receipt_url)!} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open</a>
            ) : (
              <span key="link" className="text-xs text-muted-foreground">—</span>
            ),
          ]}
        />
      </div>
    </div>
  );
}
