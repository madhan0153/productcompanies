import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/admin/admin-ui";
import { ReconcileForm, DiagnoseButton } from "./client";

export const metadata: Metadata = { title: "Admin · Reconcile subscription" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminReconcilePage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <Link href="/admin/billing" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to Billing
      </Link>

      <PageHeader
        eyebrow="Admin · Billing"
        title="Reconcile a subscription"
        description="When a user paid via Dodo but the webhook didn't fire and the sync flow didn't catch — paste the subscription id here and we'll pull it directly from Dodo and grant the right plan."
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-sm">
          <p className="font-semibold">Use this when</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            <li>A user paid (Dodo dashboard shows the subscription) but their account still says Free.</li>
            <li>The webhook URL was wrong / unset at payment time.</li>
            <li>The return URL after Dodo checkout didn't bring them back to your site.</li>
          </ul>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-elev1">
        <ReconcileForm />
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Diagnose billing config</p>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Returns what the server actually sees: NEXT_PUBLIC_APP_URL, Dodo base URL, which product IDs are set,
          and a live auth-probe to Dodo. Read this first if reconciliation isn't working.
        </p>
        <DiagnoseButton />
      </div>
    </div>
  );
}
