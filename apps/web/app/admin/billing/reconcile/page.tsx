import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Stethoscope } from "lucide-react";
import { Card } from "@/components/admin/pm";
import { ReconcileForm, DiagnoseButton } from "./client";

export const metadata: Metadata = { title: "Admin · Reconcile subscription" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminReconcilePage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 96px" }}>
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
          Reconcile a subscription
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          When a user paid via Dodo but the webhook didn’t fire and the sync flow didn’t catch — paste the subscription id here and we’ll pull it directly from Dodo and grant the right plan.
        </p>
      </header>

      <div style={{
        marginBottom: 18, padding: 14, borderRadius: 12,
        background: "var(--warn-soft)",
        border: "1px solid color-mix(in oklab, var(--warn) 30%, transparent)",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <AlertCircle size={18} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13 }}>
          <p style={{ fontWeight: 600, color: "var(--text)" }}>Use this when</p>
          <ul style={{ marginTop: 4, paddingLeft: 18, listStyle: "disc", color: "var(--text-2)", display: "flex", flexDirection: "column", gap: 2 }}>
            <li>A user paid (Dodo dashboard shows the subscription) but their account still says Free.</li>
            <li>The webhook URL was wrong / unset at payment time.</li>
            <li>The return URL after Dodo checkout didn’t bring them back to your site.</li>
          </ul>
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <ReconcileForm />
      </Card>

      <Card style={{ background: "var(--surface-2)", boxShadow: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Stethoscope size={16} style={{ color: "var(--accent)" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Diagnose billing config</p>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
          Returns what the server actually sees: NEXT_PUBLIC_APP_URL, Dodo base URL, which product IDs are set, and a live auth-probe to Dodo. Read this first if reconciliation isn’t working.
        </p>
        <DiagnoseButton />
      </Card>
    </div>
  );
}
