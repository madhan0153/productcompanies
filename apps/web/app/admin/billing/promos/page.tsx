import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, timeAgo } from "@/components/admin/admin-ui";
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
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Billing"
        title="Promo codes"
        description="Create access codes for friends, early supporters, or marketing campaigns. Codes are shown ONCE on creation — copy them immediately."
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        {/* Create form */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
              <Gift className="h-4 w-4 text-violet-500" />
            </span>
            <p className="text-sm font-semibold">Create new code</p>
          </div>
          <CreatePromoForm />
        </div>

        {/* Active codes peek */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <p className="mb-3 text-sm font-semibold">All promo codes ({promos?.length ?? 0})</p>
          {(!promos || promos.length === 0) ? (
            <p className="text-sm text-muted-foreground">No promo codes yet. Create one on the left.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {promos.map((p) => {
                const exhausted = p.max_redemptions !== null && p.redeemed_count >= p.max_redemptions;
                const expired   = p.expires_at && new Date(p.expires_at) < new Date();
                const dead      = !p.is_active || exhausted || expired;
                const stateLabel = !p.is_active ? "Disabled" : exhausted ? "Exhausted" : expired ? "Expired" : "Active";
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.code_label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.grant_type.replace(/_/g, " ")}
                        {p.credit_kind && ` · ${p.credit_amount} ${p.credit_kind.replace(/_/g, " ")}`}
                        {p.duration_days && ` · ${p.duration_days}d`}
                        {" · "}
                        {p.redeemed_count}/{p.max_redemptions ?? "∞"} redeemed
                        {" · "}
                        {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <Badge tone={dead ? "muted" : "green"}>{stateLabel}</Badge>
                    {!dead && (
                      <DeactivatePromoButton id={p.id} label={p.code_label ?? "this code"} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
