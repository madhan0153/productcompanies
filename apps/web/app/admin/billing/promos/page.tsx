import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, SectionHeader } from "@/components/admin/pm";
import { CreatePromoForm, DeactivatePromoButton } from "./client-forms";

export const metadata: Metadata = { title: "Admin · Promo Codes" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PromoRow {
  id: string;
  code_label: string | null;
  grant_type: string;
  credit_kind: string | null;
  credit_amount: number | null;
  duration_days: number | null;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default async function AdminPromosPage() {
  const admin = createSupabaseAdminClient();

  const { data: promos } = await admin
    .from("promo_codes")
    .select("id, code_label, grant_type, credit_kind, credit_amount, duration_days, max_redemptions, redeemed_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100) as { data: PromoRow[] | null };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 96px" }}>
      <Link
        href="/admin/billing"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}
      >
        <ArrowLeft size={12} /> Back to Billing
      </Link>

      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Billing
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Promo codes
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Create access codes for friends, early supporters, or marketing campaigns. Codes are shown ONCE on creation — copy them immediately.
        </p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--accent-soft)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Gift size={14} style={{ color: "var(--accent)" }} />
            </span>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Create new code</p>
          </div>
          <CreatePromoForm />
        </Card>

        <Card p={0}>
          <SectionHeader title={`All promo codes (${promos?.length ?? 0})`} />
          {(!promos || promos.length === 0) ? (
            <div style={{ padding: 16, color: "var(--text-3)", fontSize: 13 }}>
              No promo codes yet. Create one on the left.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {promos.map((p, i) => {
                const exhausted = p.max_redemptions !== null && p.redeemed_count >= p.max_redemptions;
                const expired   = p.expires_at && new Date(p.expires_at) < new Date();
                const dead      = !p.is_active || exhausted || expired;
                const stateLabel = !p.is_active ? "Disabled" : exhausted ? "Exhausted" : expired ? "Expired" : "Active";
                return (
                  <li
                    key={p.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: i < promos.length - 1 ? "1px solid var(--line-2)" : "none",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 12, flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.code_label}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {p.grant_type.replace(/_/g, " ")}
                        {p.credit_kind && ` · ${p.credit_amount} ${p.credit_kind.replace(/_/g, " ")}`}
                        {p.duration_days && ` · ${p.duration_days}d`}
                        {" · "}
                        {p.redeemed_count}/{p.max_redemptions ?? "∞"} redeemed
                        {" · "}
                        {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <Badge tone={dead ? "neutral" : "ok"}>{stateLabel}</Badge>
                    {!dead && <DeactivatePromoButton id={p.id} label={p.code_label ?? "this code"} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
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
