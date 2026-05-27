"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import {
  grantPlanToUser,
  grantCreditsToUser,
  revokeGrant,
  type GrantFormState,
} from "@/lib/admin/actions/grants";

const initialState: GrantFormState = { ok: false, message: "" };

export function GrantPlanForm() {
  const [state, action, pending] = useActionState(grantPlanToUser, initialState);

  return (
    <form action={action} className="space-y-3">
      <Field label="User email or id">
        <input
          type="text"
          name="emailOrId"
          required
          placeholder="friend@example.com"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan">
          <select name="plan" defaultValue="pro" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="pro">Pro</option>
            <option value="career_sprint">Career Sprint</option>
          </select>
        </Field>
        <Field label="Duration">
          <select name="duration" defaultValue="12mo" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="180d">180 days</option>
            <option value="12mo">12 months</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </Field>
      </div>

      <Field label="Reason (audit log)">
        <input
          type="text"
          name="reason"
          placeholder="Founder's friend — early supporter"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </Field>

      <SubmitBar pending={pending} state={state} cta="Grant plan" />
    </form>
  );
}

export function GrantCreditsForm() {
  const [state, action, pending] = useActionState(grantCreditsToUser, initialState);

  return (
    <form action={action} className="space-y-3">
      <Field label="User email or id">
        <input type="text" name="emailOrId" required placeholder="friend@example.com" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" autoComplete="off" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Credit kind">
          <select name="kind" defaultValue="tailored_resume" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="tailored_resume">Tailored resume</option>
            <option value="resume_reparse">Resume re-parse</option>
            <option value="priority_recompute">Priority recompute</option>
          </select>
        </Field>
        <Field label="Amount">
          <input type="number" name="amount" min={1} max={1000} defaultValue={10} required className="input tabular-nums" />
        </Field>
      </div>

      <Field label="Reason (audit log)">
        <input type="text" name="reason" placeholder="goodwill / promo / refund" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </Field>

      <SubmitBar pending={pending} state={state} cta="Grant credits" />
    </form>
  );
}

export function RevokeGrantButton({ grantId, label }: { grantId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`Revoke this grant for ${label}? The user will lose access after their entitlements refresh.`)) return;
        start(() => revokeGrant(grantId));
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      Revoke
    </button>
  );
}

// ─── shared form atoms ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SubmitBar({ pending, state, cta }: { pending: boolean; state: GrantFormState; cta: string }) {
  return (
    <div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? "Working…" : cta}
      </button>
      {state.message && (
        <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          state.ok
            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
            : "border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-400"
        }`}>
          {state.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {state.message}
        </div>
      )}
    </div>
  );
}
