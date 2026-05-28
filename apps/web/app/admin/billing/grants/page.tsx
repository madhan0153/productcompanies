import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Coins, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, ListRow, SectionHeader } from "@/components/admin/pm";
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

  const userIds = Array.from(new Set((grants ?? []).map((g) => g.user_id))).filter(Boolean);
  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usersResp?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? "");
    }
  }

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
          Grant access
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Give Pro / Career Sprint or Tailor Credits to any user. Grants are membership-only — they never confer admin access.
        </p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--accent-soft)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={14} style={{ color: "var(--accent)" }} />
            </span>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Grant a plan</p>
          </div>
          <GrantPlanForm />
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--warn-soft)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Coins size={14} style={{ color: "var(--warn)" }} />
            </span>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Grant Tailor Credits</p>
          </div>
          <GrantCreditsForm />
        </Card>
      </div>

      <SectionHeader title="Recent grants" sub="Last 50" />
      <Card p={0}>
        {(!grants || grants.length === 0) ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No grants yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {grants.map((g, i) => {
              const email = emailMap.get(g.user_id) ?? g.user_id.slice(0, 12);
              const isRevoked = !!g.revoked_at;
              const isExpired = g.expires_at && new Date(g.expires_at) < new Date();
              const label = g.grant_type === "credits_fixed"
                ? `${g.credit_amount} × ${g.credit_kind?.replace(/_/g, " ")}`
                : `${g.plan ?? g.grant_type}`;
              const tone: "ok" | "warn" | "accent" | "neutral" =
                isRevoked ? "neutral" : isExpired ? "warn" : g.plan === "career_sprint" ? "accent" : "ok";
              return (
                <ListRow
                  key={g.id}
                  divider={i < grants.length - 1}
                  title={<span className="pm-mono">{email}</span>}
                  subtitle={`${g.source} · ${g.reason ?? "no reason"} · ${timeAgo(g.created_at)}`}
                  trailing={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Badge tone={tone}>
                        {label}{isRevoked ? " (revoked)" : isExpired ? " (expired)" : ""}
                      </Badge>
                      {!isRevoked && <RevokeGrantButton grantId={g.id} label={email} />}
                    </span>
                  }
                />
              );
            })}
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
