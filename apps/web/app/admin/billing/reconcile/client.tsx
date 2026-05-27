"use client";

import { useActionState, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Stethoscope } from "lucide-react";
import { reconcileSubscription, type ReconcileFormState } from "@/lib/admin/actions/reconcile";

const initialState: ReconcileFormState = { ok: false, message: "" };
const INPUT = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function ReconcileForm() {
  const [state, action, pending] = useActionState(reconcileSubscription, initialState);

  return (
    <form action={action} className="space-y-3">
      <Field label="Dodo subscription_id" hint="Looks like sub_… — copy from Dodo dashboard or the return URL.">
        <input type="text" name="subscriptionId" required placeholder="sub_0Nfkzok…" className={`${INPUT} font-mono`} autoComplete="off" />
      </Field>

      <Field label="User email or id" hint="The ProdMatch account that should receive the plan.">
        <input type="text" name="emailOrId" required placeholder="user@example.com" className={INPUT} autoComplete="off" />
      </Field>

      <Field label="Override plan (optional)" hint="Only set this if Dodo's product_id doesn't match any DODO_PRODUCT_*_ID env var.">
        <select name="planOverride" defaultValue="" className={INPUT}>
          <option value="">Auto-detect from product_id</option>
          <option value="pro">Pro</option>
          <option value="career_sprint">Career Sprint</option>
        </select>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {pending ? "Reconciling…" : "Reconcile subscription"}
      </button>

      {state.message && (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          state.ok
            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
            : "border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-400"
        }`}>
          {state.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{state.message}</span>
        </div>
      )}

      {state.details?.dodoResponse && (
        <details className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Dodo response (for debugging)</summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 font-mono text-[10px]">
            {JSON.stringify(state.details.dodoResponse, null, 2)}
          </pre>
        </details>
      )}
    </form>
  );
}

export function DiagnoseButton() {
  const [result, setResult] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const res  = await fetch("/api/billing/diagnose", { cache: "no-store" });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-xs font-medium hover:bg-secondary disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
        {pending ? "Probing Dodo…" : "Run diagnostic"}
      </button>
      {result !== null && (
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 font-mono text-[10px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-medium">{label}</span>
      {hint && <span className="mb-1 block text-[10px] text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}
