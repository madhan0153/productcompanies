import type { Metadata } from "next";
import Link from "next/link";
import { Users, Coins, ArrowLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Badge, timeAgo } from "@/components/admin/admin-ui";
import { GrantPlanForm, GrantCreditsForm, RevokeGrantButton } from "./client-forms";

export const metadata: Metadata = { title: "Admin · Grants" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface GrantRow {
  id: string;
  user_id: string;
  grant_type: string;
  plan: string | null;
  credit_kind: string | null;
  credit_amount: number | null;
  expires_at: string | null;
  source: string;
  reason: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default async function AdminGrantsPage() {
  const admin = createSupabaseAdminClient();

  const { data: grants } = await admin
    .from("entitlement_grants")
    .select("id, user_id, grant_type, plan, credit_kind, credit_amount, expires_at, source, reason, revoked_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50) as { data: GrantRow[] | null };

  // Fetch emails for grant users — single admin auth listUsers call
  const userIds = Array.from(new Set((grants ?? []).map((g) => g.user_id))).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Billing"
        title="Grant access"
        description="Give Pro / Career Sprint or Tailor Credits to any user. Grants are membership-only — they never confer admin access."
      />

      {/* Action forms */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <FormPanel icon={<Users className="h-4 w-4 text-primary" />} title="Grant a plan">
          <GrantPlanForm />
        </FormPanel>
        <FormPanel icon={<Coins className="h-4 w-4 text-amber-500" />} title="Grant Tailor Credits">
          <GrantCreditsForm />
        </FormPanel>
      </div>

      {/* Recent grants */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
        <p className="mb-3 text-sm font-semibold">Recent grants (last 50)</p>
        {(!grants || grants.length === 0) ? (
          <p className="text-sm text-muted-foreground">No grants yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {grants.map((g) => {
              const email = emailMap.get(g.user_id) ?? g.user_id.slice(0, 12);
              const isRevoked = !!g.revoked_at;
              const isExpired = g.expires_at && new Date(g.expires_at) < new Date();
              const label = g.grant_type === "credits_fixed"
                ? `${g.credit_amount} × ${g.credit_kind?.replace(/_/g, " ")}`
                : `${g.plan ?? g.grant_type}`;
              return (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.source} · {g.reason ?? "no reason"} · {timeAgo(g.created_at)}
                    </p>
                  </div>
                  <Badge tone={isRevoked ? "muted" : isExpired ? "warn" : g.plan === "career_sprint" ? "violet" : "green"}>
                    {label}{isRevoked ? " (revoked)" : isExpired ? " (expired)" : ""}
                  </Badge>
                  {!isRevoked && (
                    <RevokeGrantButton grantId={g.id} label={email} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FormPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}
