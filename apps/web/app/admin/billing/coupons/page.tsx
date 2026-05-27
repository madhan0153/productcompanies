import type { Metadata } from "next";
import Link from "next/link";
import {
  Gift, ArrowLeft, Sparkles, Percent, IndianRupee, TrendingUp, Users,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/admin-ui";
import { CouponsClient } from "./client";

export const metadata: Metadata = { title: "Admin · Coupons" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface CouponRow {
  id:             string;
  code_label:     string | null;
  grant_type:     string;
  credit_kind:    string | null;
  credit_amount:  number | null;
  duration_days:  number | null;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at:     string | null;
  is_active:      boolean;
  created_at:     string;
}

export default async function AdminCouponsPage() {
  const admin = createSupabaseAdminClient();

  const { data: rows } = await admin
    .from("promo_codes")
    .select("id, code_label, grant_type, credit_kind, credit_amount, duration_days, max_redemptions, redeemed_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(200) as { data: CouponRow[] | null };

  const coupons = rows ?? [];

  // KPIs
  const now = Date.now();
  const active = coupons.filter((c) => {
    if (!c.is_active) return false;
    if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
    if (c.max_redemptions !== null && c.redeemed_count >= c.max_redemptions) return false;
    return true;
  });
  const totalRedemptions = coupons.reduce((s, c) => s + c.redeemed_count, 0);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Billing"
        title="Coupons"
        description="Create access codes for friends, marketing pushes, and partnerships. Codes are shown ONCE on creation — copy them immediately."
      />

      {/* KPI strip */}
      <section className="mb-5 grid grid-cols-3 gap-3">
        <Kpi icon={<Sparkles className="h-3.5 w-3.5 text-emerald-500" />}  label="Active codes"  value={active.length} />
        <Kpi icon={<Users className="h-3.5 w-3.5 text-primary" />}         label="Redemptions"   value={totalRedemptions} />
        <Kpi icon={<TrendingUp className="h-3.5 w-3.5 text-violet-500" />} label="Total codes"   value={coupons.length} />
      </section>

      {/* Client: search, filters, list, create form */}
      <CouponsClient coupons={coupons} />

      {/* Footer note */}
      <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">How coupons work</p>
        <p>
          Codes are hashed before storage — the plaintext is shown <strong>once</strong> at creation
          and never again, even to admins. Friends redeem at <code className="rounded bg-background px-1">/early-access</code> or
          on the pricing page. Each user can redeem each code at most once. Promo grants confer
          billing entitlements only — never admin access.
        </p>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-elev1">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
