"use client";

import { useActionState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { useConfirm } from "@/components/admin/pm";
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
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="User email or id">
        <input type="text" name="emailOrId" required placeholder="friend@example.com" className="pm-input" autoComplete="off" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Plan">
          <select name="plan" defaultValue="pro" className="pm-select">
            <option value="pro">Pro</option>
            <option value="career_sprint">Career Sprint</option>
          </select>
        </Field>
        <Field label="Duration">
          <select name="duration" defaultValue="12mo" className="pm-select">
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="180d">180 days</option>
            <option value="12mo">12 months</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </Field>
      </div>

      <Field label="Reason (audit log)">
        <input type="text" name="reason" placeholder="Founder's friend — early supporter" className="pm-input" />
      </Field>

      <SubmitBar pending={pending} state={state} cta="Grant plan" />
    </form>
  );
}

export function GrantCreditsForm() {
  const [state, action, pending] = useActionState(grantCreditsToUser, initialState);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="User email or id">
        <input type="text" name="emailOrId" required placeholder="friend@example.com" className="pm-input" autoComplete="off" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Credit kind">
          <select name="kind" defaultValue="tailored_resume" className="pm-select">
            <option value="tailored_resume">Tailored resume</option>
            <option value="resume_reparse">Resume re-parse</option>
            <option value="priority_recompute">Priority recompute</option>
          </select>
        </Field>
        <Field label="Amount">
          <input type="number" name="amount" min={1} max={1000} defaultValue={10} required className="pm-input pm-num" />
        </Field>
      </div>

      <Field label="Reason (audit log)">
        <input type="text" name="reason" placeholder="goodwill / promo / refund" className="pm-input" />
      </Field>

      <SubmitBar pending={pending} state={state} cta="Grant credits" />
    </form>
  );
}

export function RevokeGrantButton({ grantId, label }: { grantId: string; label: string }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({
            title: "Revoke this grant?",
            body: `${label} will lose access after their entitlements refresh.`,
            confirmLabel: "Revoke",
            danger: true,
          });
          if (!ok) return;
          start(() => revokeGrant(grantId));
        }}
        disabled={pending}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
          background: "var(--surface)", color: "var(--text-3)",
          border: "1px solid var(--line)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <X size={12} />}
        Revoke
      </button>
      {dialog}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span className="pm-label">{label}</span>
      {children}
    </label>
  );
}

function SubmitBar({ pending, state, cta }: { pending: boolean; state: GrantFormState; cta: string }) {
  return (
    <div>
      <button type="submit" disabled={pending} className="pm-cta" style={{ width: "100%" }}>
        {pending ? "Working…" : cta}
      </button>
      {state.message && (
        <div className="pm-alert" data-tone={state.ok ? "ok" : "err"}>
          {state.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
