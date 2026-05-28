import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, ListRow, SectionHeader } from "@/components/admin/pm";

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

  const [subsResult, invoicesResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, user_id, provider, plan, status, current_period_end, cancel_at_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(100) as never,
    admin
      .from("invoices")
      .select("id, user_id, provider, amount, currency, status, receipt_url, hosted_invoice_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100) as never,
  ]);

  const subs     = ((subsResult     as { data: SubRow[]     | null }).data ?? []);
  const invoices = ((invoicesResult as { data: InvoiceRow[] | null }).data ?? []);

  const userIds = Array.from(new Set([...subs.map((s) => s.user_id), ...invoices.map((i) => i.user_id)])).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <Link href="/admin/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
        <ArrowLeft size={12} /> Back to Billing
      </Link>

      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Billing
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Subscriptions & Invoices
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Live subscription state and recent invoices. To refund, open the receipt in your Dodo dashboard.
        </p>
      </header>

      <SectionHeader title={`Subscriptions (${subs.length})`} />
      <Card p={0}>
        {subs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No subscriptions yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {subs.map((s, i) => (
              <ListRow
                key={s.id}
                divider={i < subs.length - 1}
                href={`/admin/users/${s.user_id}`}
                title={<span className="pm-mono">{emailMap.get(s.user_id) ?? s.user_id.slice(0, 12)}</span>}
                subtitle={`${s.provider} · renews ${s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("en-IN") : "—"}${s.cancel_at_period_end ? " (cancel pending)" : ""}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Badge tone={s.plan === "career_sprint" ? "accent" : "info"}>{s.plan}</Badge>
                    <Badge tone={s.status === "active" ? "ok" : s.status === "cancelled" ? "neutral" : "warn"}>
                      {s.status}
                    </Badge>
                    <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 56, textAlign: "right" }}>
                      {timeAgo(s.created_at)}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title={`Recent invoices (${invoices.length})`} />
      <Card p={0}>
        {invoices.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No invoices yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {invoices.map((r, i) => (
              <ListRow
                key={r.id}
                divider={i < invoices.length - 1}
                href={`/admin/users/${r.user_id}`}
                title={<span className="pm-mono">{emailMap.get(r.user_id) ?? r.user_id.slice(0, 12)}</span>}
                subtitle={`${r.provider} · ${timeAgo(r.created_at)}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="pm-num" style={{ fontSize: 13, fontWeight: 600 }}>
                      ₹{(r.amount / 100).toLocaleString("en-IN")}
                    </span>
                    <Badge tone={r.status === "paid" ? "ok" : "err"}>{r.status}</Badge>
                    {(r.hosted_invoice_url || r.receipt_url) && (
                      <a
                        href={(r.hosted_invoice_url ?? r.receipt_url)!}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}
                      >
                        Open
                      </a>
                    )}
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
