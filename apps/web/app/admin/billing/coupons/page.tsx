import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gift, Sparkles, TrendingUp, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, KPI } from "@/components/admin/pm";
import { CouponsClient } from "./client";

export const metadata: Metadata = { title: "Admin · Coupons" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface CouponRow {
  id:              string;
  code_label:      string | null;
  grant_type:      string;
  credit_kind:     string | null;
  credit_amount:   number | null;
  duration_days:   number | null;
  max_redemptions: number | null;
  redeemed_count:  number;
  expires_at:      string | null;
  is_active:       boolean;
  created_at:      string;
}

export default async function AdminCouponsPage() {
  const admin = createSupabaseAdminClient();

  const { data: rows } = await admin
    .from("promo_codes")
    .select("id, code_label, grant_type, credit_kind, credit_amount, duration_days, max_redemptions, redeemed_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(200) as { data: CouponRow[] | null };

  const coupons = rows ?? [];

  const now = Date.now();
  const active = coupons.filter((c) => {
    if (!c.is_active) return false;
    if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
    if (c.max_redemptions !== null && c.redeemed_count >= c.max_redemptions) return false;
    return true;
  });
  const totalRedemptions = coupons.reduce((s, c) => s + c.redeemed_count, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px 96px" }}>
      <Link href="/admin/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
        <ArrowLeft size={12} /> Back to Billing
      </Link>

      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Billing
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Coupons
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Create access codes for friends, marketing pushes, and partnerships. Codes are shown ONCE on creation — copy them immediately.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Active codes"  value={String(active.length)}      hint="Live + not exhausted" accent />
        <KPI label="Redemptions"   value={String(totalRedemptions)}   hint="All-time" />
        <KPI label="Total codes"   value={String(coupons.length)}     hint="Issued" />
      </div>

      <div style={{ marginTop: 22 }}>
        <CouponsClient coupons={coupons} />
      </div>

      <Card style={{ marginTop: 22, background: "var(--surface-2)", boxShadow: "none" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>How coupons work</p>
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
          Codes are hashed before storage — the plaintext is shown <strong style={{ color: "var(--text-2)" }}>once</strong> at creation
          and never again, even to admins. Friends redeem at <code style={{ background: "var(--surface)", padding: "1px 6px", borderRadius: 4, fontFamily: "var(--font-mono)" }}>/early-access</code> or
          on the pricing page. Each user can redeem each code at most once. Promo grants confer billing entitlements only — never admin access.
        </p>
        {/* unused-icon silencing */}
        <span style={{ display: "none" }}>{[<Sparkles key="s" />, <TrendingUp key="t" />, <Users key="u" />, <Gift key="g" />]}</span>
      </Card>
    </div>
  );
}
