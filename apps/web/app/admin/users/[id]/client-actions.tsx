"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import {
  suspendUser,
  unsuspendUser,
  deleteUser,
  clearResumeParseError,
  type UserActionState,
} from "@/lib/admin/actions/users";

const initialState: UserActionState = { ok: false, message: "" };

export function SuspendForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(suspendUser, initialState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="userId" value={userId} />
      <label style={{ display: "block" }}>
        <span className="pm-label">Reason for suspension</span>
        <input type="text" name="reason" required placeholder="e.g. spam reports, ToS violation" className="pm-input" />
      </label>
      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%", height: 38, padding: "0 14px", borderRadius: 9,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "var(--warn-soft)", color: "var(--warn)",
          border: "1px solid color-mix(in oklab, var(--warn) 40%, transparent)",
          fontWeight: 600, fontSize: 13, cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
        {pending ? "Suspending…" : "Suspend user"}
      </button>
      {state.message && (
        <p style={{ fontSize: 11, color: state.ok ? "var(--ok)" : "var(--err)" }}>{state.message}</p>
      )}
    </form>
  );
}

export function UnsuspendButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => unsuspendUser(userId))}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: "var(--ok-soft)", color: "var(--ok)",
        border: "1px solid color-mix(in oklab, var(--ok) 40%, transparent)",
        cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.5 : 1,
      }}
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
      Unsuspend
    </button>
  );
}

export function ReparseButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await clearResumeParseError(userId);
            setDone(true);
            setTimeout(() => setDone(false), 4000);
          });
        }}
        className="pm-cta"
        style={{ width: "100%" }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {pending ? "Queueing…" : "Clear error & re-parse resume"}
      </button>
      {done && (
        <p style={{ fontSize: 11, color: "var(--ok)" }}>
          Re-parse queued. Parser will pick it up on next drain.
        </p>
      )}
    </div>
  );
}

export function DeleteUserDialog({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState(deleteUser, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%", height: 38, padding: "0 14px", borderRadius: 9,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "var(--err-soft)", color: "var(--err)",
          border: "1px solid color-mix(in oklab, var(--err) 40%, transparent)",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}
      >
        <Trash2 size={14} /> Delete user
      </button>
    );
  }

  return (
    <form action={action} style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: 12, borderRadius: 10,
      background: "var(--err-soft)",
      border: "1px solid color-mix(in oklab, var(--err) 30%, transparent)",
    }}>
      <input type="hidden" name="userId" value={userId} />
      <p style={{ fontSize: 12, color: "var(--text)" }}>
        Type <code style={{ background: "var(--surface)", padding: "1px 6px", borderRadius: 4, fontFamily: "var(--font-mono)" }}>DELETE</code> to permanently erase{" "}
        <strong style={{ wordBreak: "break-all" }}>{email}</strong> and all owned data.
      </p>
      <input type="text" name="confirm" autoComplete="off" required placeholder="DELETE" className="pm-input" />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            flex: 1, height: 34, borderRadius: 8,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "var(--err)", color: "#fff",
            border: "1px solid transparent",
            fontSize: 12, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Confirm delete
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            height: 34, padding: "0 14px", borderRadius: 8,
            background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--line)",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
      {state.message && (
        <p style={{
          display: "flex", alignItems: "flex-start", gap: 4,
          fontSize: 11, color: state.ok ? "var(--ok)" : "var(--err)",
        }}>
          {state.ok ? <CheckCircle2 size={12} style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertCircle size={12} style={{ marginTop: 2, flexShrink: 0 }} />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}
