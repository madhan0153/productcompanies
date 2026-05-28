"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Copy, Loader2, X } from "lucide-react";
import {
  createPromoCode,
  deactivatePromoCode,
  type PromoFormState,
} from "@/lib/admin/actions/promos";

const initialState: PromoFormState = { ok: false, message: "" };

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
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Label (admin-only, e.g. 'Founders Q1')">
        <input type="text" name="label" required maxLength={64} className="pm-input" />
      </Field>

      <Field label="Code prefix (optional, e.g. 'FRIEND')">
        <input type="text" name="prefix" defaultValue="FRIEND" maxLength={8} className="pm-input" />
      </Field>

      <Field label="Grant type">
        <select name="grantType" value={grantType} onChange={(e) => setGrantType(e.target.value)} className="pm-select">
          <option value="pro_12_months">Pro — 12 months</option>
          <option value="pro_lifetime">Pro — Lifetime</option>
          <option value="career_sprint_3_months">Career Sprint — 3 months</option>
          <option value="credits_fixed">Credits — fixed amount</option>
        </select>
      </Field>

      {grantType === "credits_fixed" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Credit kind">
            <select name="creditKind" defaultValue="tailored_resume" className="pm-select">
              <option value="tailored_resume">Tailored resume</option>
              <option value="resume_reparse">Resume re-parse</option>
              <option value="priority_recompute">Priority recompute</option>
            </select>
          </Field>
          <Field label="Credit amount">
            <input type="number" name="creditAmount" min={1} max={1000} defaultValue={10} className="pm-input pm-num" />
          </Field>
        </div>
      )}

      <Field label="Custom duration days (optional, overrides default)">
        <input type="number" name="durationDays" min={1} max={3650} placeholder="auto" className="pm-input pm-num" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Max redemptions">
          <input type="number" name="maxRedemptions" min={1} placeholder="unlimited" className="pm-input pm-num" />
        </Field>
        <Field label="Code expires in (days)">
          <input type="number" name="expiresInDays" min={1} max={3650} placeholder="never" className="pm-input pm-num" />
        </Field>
      </div>

      <button type="submit" disabled={pending} className="pm-cta" style={{ width: "100%" }}>
        {pending ? "Creating…" : "Create code"}
      </button>

      {state.message && (
        <div className="pm-alert" data-tone={state.ok ? "ok" : "err"}>
          {state.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{state.message}</span>
        </div>
      )}

      {state.ok && state.code && (
        <div style={{
          padding: 14, borderRadius: 14,
          background: "var(--accent-soft)",
          border: "2px dashed color-mix(in oklab, var(--accent) 40%, transparent)",
        }}>
          <p style={{ marginBottom: 8, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent-strong)" }}>
            ⚠ Copy now — shown only once
          </p>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8,
            background: "var(--surface)",
          }}>
            <code style={{
              flex: 1, fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700,
              letterSpacing: "0.06em", color: "var(--text)", wordBreak: "break-all",
            }}>{state.code}</code>
            <button
              type="button"
              onClick={copy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 6,
                background: "var(--surface-2)", color: "var(--text)",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >
              {copied ? <CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> : <Copy size={14} />}
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
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
        background: "var(--surface)", color: "var(--text-3)",
        border: "1px solid var(--line)",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      Disable
    </button>
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
