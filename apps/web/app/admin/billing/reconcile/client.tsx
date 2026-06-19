"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Stethoscope } from "lucide-react";
import { reconcileSubscription, type ReconcileFormState } from "@/lib/admin/actions/reconcile";

const initialState: ReconcileFormState = { ok: false, message: "" };

export function ReconcileForm() {
  const [state, action, pending] = useActionState(reconcileSubscription, initialState);
  const inputKey = `${state.input?.subscriptionId ?? ""}:${state.input?.emailOrId ?? ""}:${state.input?.planOverride ?? ""}`;

  return (
    <form key={inputKey} action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Dodo subscription_id" hint="Looks like sub_… — copy from Dodo dashboard or the return URL.">
        <input type="text" name="subscriptionId" required defaultValue={state.input?.subscriptionId} placeholder="sub_0Nfkzok…" className="pm-input pm-mono" autoComplete="off" />
      </Field>

      <Field label="ProdMatch email or user id (optional)" hint="Usually leave blank. We auto-detect the account from Dodo metadata, checkout records, and customer email.">
        <input type="text" name="emailOrId" defaultValue={state.input?.emailOrId} placeholder="Only enter if auto-detection needs help" className="pm-input" autoComplete="off" />
      </Field>

      <Field label="Override plan (optional)" hint="Only set this if Dodo's product_id doesn't match any DODO_PRODUCT_*_ID env var.">
        <select name="planOverride" defaultValue={state.input?.planOverride ?? ""} className="pm-select">
          <option value="">Auto-detect from product_id</option>
          <option value="pro">Pro</option>
          <option value="career_sprint">Career Sprint</option>
        </select>
      </Field>

      <button type="submit" disabled={pending} className="pm-cta" style={{ width: "100%" }}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {pending ? "Reconciling…" : "Reconcile subscription"}
      </button>

      {state.message && (
        <div className="pm-alert" data-tone={state.ok ? "ok" : "err"}>
          {state.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{state.message}</span>
        </div>
      )}

      {state.details?.dodoShape && (
        <details style={{
          padding: 12, borderRadius: 10,
          background: "var(--surface-2)", border: "1px solid var(--line)",
          fontSize: 12,
        }}>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Dodo response shape</summary>
          <pre style={{
            marginTop: 8, maxHeight: 240, overflow: "auto", padding: 10,
            borderRadius: 8, background: "var(--surface)",
            fontFamily: "var(--font-mono)", fontSize: 11,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {JSON.stringify(state.details, null, 2)}
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
      <button type="button" disabled={pending} onClick={run} className="pm-cta pm-cta-secondary" style={{ height: 36 }}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
        {pending ? "Probing Dodo…" : "Run diagnostic"}
      </button>
      {result !== null && (
        <pre style={{
          marginTop: 12, maxHeight: 400, overflow: "auto", padding: 12,
          borderRadius: 10,
          background: "var(--surface-2)", border: "1px solid var(--line)",
          fontFamily: "var(--font-mono)", fontSize: 11,
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span className="pm-label">{label}</span>
      {hint && <span style={{ display: "block", fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{hint}</span>}
      {children}
    </label>
  );
}
