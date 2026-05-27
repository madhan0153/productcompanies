"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import {
  createPromoCode,
  deactivatePromoCode,
  type PromoFormState,
} from "@/lib/admin/actions/promos";

const initialState: PromoFormState = { ok: false, message: "" };
const INPUT = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CreatePromoForm() {
  const [state, action, pending] = useActionState(createPromoCode, initialState);
  const [grantType, setGrantType] = useState("pro_12_months");
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <form action={action} className="space-y-3">
      <Field label="Label (admin-only, e.g. 'Founders Q1')">
        <input type="text" name="label" required maxLength={64} className={INPUT} />
      </Field>

      <Field label="Code prefix (optional, e.g. 'FRIEND')">
        <input type="text" name="prefix" defaultValue="FRIEND" maxLength={8} className={INPUT} />
      </Field>

      <Field label="Grant type">
        <select name="grantType" value={grantType} onChange={(e) => setGrantType(e.target.value)} className={INPUT}>
          <option value="pro_12_months">Pro — 12 months</option>
          <option value="pro_lifetime">Pro — Lifetime</option>
          <option value="career_sprint_3_months">Career Sprint — 3 months</option>
          <option value="credits_fixed">Credits — fixed amount</option>
        </select>
      </Field>

      {grantType === "credits_fixed" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit kind">
            <select name="creditKind" defaultValue="tailored_resume" className={INPUT}>
              <option value="tailored_resume">Tailored resume</option>
              <option value="resume_reparse">Resume re-parse</option>
              <option value="priority_recompute">Priority recompute</option>
            </select>
          </Field>
          <Field label="Credit amount">
            <input type="number" name="creditAmount" min={1} max={1000} defaultValue={10} className={`${INPUT} tabular-nums`} />
          </Field>
        </div>
      )}

      <Field label="Custom duration days (optional, overrides default)">
        <input type="number" name="durationDays" min={1} max={3650} placeholder="auto" className={`${INPUT} tabular-nums`} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Max redemptions">
          <input type="number" name="maxRedemptions" min={1} placeholder="unlimited" className={`${INPUT} tabular-nums`} />
        </Field>
        <Field label="Code expires in (days)">
          <input type="number" name="expiresInDays" min={1} max={3650} placeholder="never" className={`${INPUT} tabular-nums`} />
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create code"}
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

      {state.ok && state.code && (
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-primary">⚠️ Copy now — shown only once</p>
          <div className="flex items-center gap-2 rounded-lg bg-background p-3">
            <code className="flex-1 break-all font-mono text-base font-bold tracking-widest">{state.code}</code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export function DeactivatePromoButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`Disable "${label}"? Existing redemptions stay valid; new redemptions will be rejected.`)) return;
        start(() => deactivatePromoCode(id));
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      Disable
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
