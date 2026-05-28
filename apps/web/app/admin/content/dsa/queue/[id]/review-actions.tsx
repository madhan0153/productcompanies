"use client";

import { useState, useTransition } from "react";
import {
  approveQuestion,
  rejectQuestion,
  deferQuestion,
  reopenQuestion,
  saveInternalNotes,
} from "../actions";

type Status = "pending_review" | "live" | "rejected" | "deferred" | "archived";

export function ReviewActions({
  questionId,
  status,
  rejectionReason,
  internalNotes,
}: {
  questionId: string;
  status: Status;
  rejectionReason: string | null;
  internalNotes: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showDeferForm,  setShowDeferForm]  = useState(false);
  const [reason, setReason] = useState("");
  const [notes,  setNotes]  = useState(internalNotes ?? "");

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, successMessage: string) {
    clearMessages();
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setSuccess(successMessage);
        setShowRejectForm(false);
        setShowDeferForm(false);
        setReason("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: "var(--accent-soft)", border: "1px solid var(--accent)",
      marginBottom: 18,
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-strong)" }}>
        Review actions
      </p>

      {status === "rejected" && rejectionReason && (
        <p style={{ marginTop: 6, fontSize: 12, color: "var(--err)" }}>
          Rejected: {rejectionReason}
        </p>
      )}
      {status === "deferred" && internalNotes && (
        <p style={{ marginTop: 6, fontSize: 12, color: "var(--warn)" }}>
          Deferred: {internalNotes}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {status !== "live" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => approveQuestion(questionId), "Approved — now live.")}
            style={btnStyle("ok")}
          >
            Approve → Live
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => { clearMessages(); setShowRejectForm((s) => !s); setShowDeferForm(false); }}
            style={btnStyle("err")}
          >
            Reject…
          </button>
        )}
        {status !== "deferred" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => { clearMessages(); setShowDeferForm((s) => !s); setShowRejectForm(false); }}
            style={btnStyle("warn")}
          >
            Defer…
          </button>
        )}
        {(status === "rejected" || status === "deferred" || status === "live") && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => reopenQuestion(questionId), "Reopened — back to pending_review.")}
            style={btnStyle("muted")}
          >
            Reopen
          </button>
        )}
      </div>

      {showRejectForm && (
        <ActionForm
          label="Rejection reason"
          placeholder="What's wrong? (min 5 chars)"
          value={reason}
          onChange={setReason}
          onSubmit={() => run(() => rejectQuestion(questionId, reason), "Rejected.")}
          onCancel={() => { setShowRejectForm(false); setReason(""); }}
          tone="err"
        />
      )}
      {showDeferForm && (
        <ActionForm
          label="Defer reason"
          placeholder="Why defer? (min 5 chars)"
          value={reason}
          onChange={setReason}
          onSubmit={() => run(() => deferQuestion(questionId, reason), "Deferred.")}
          onCancel={() => { setShowDeferForm(false); setReason(""); }}
          tone="warn"
        />
      )}

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-2)" }}>
          Internal notes (not user-visible)
        </summary>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes for your own future review…"
          style={{
            width: "100%", marginTop: 8, padding: 10, borderRadius: 8,
            border: "1px solid var(--line)", background: "var(--surface)",
            fontSize: 13, lineHeight: 1.5, color: "var(--text)",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => saveInternalNotes(questionId, notes), "Notes saved.")}
          style={{
            ...btnStyle("muted"),
            marginTop: 8,
          }}
        >
          Save notes
        </button>
      </details>

      {error   && <p style={{ marginTop: 10, fontSize: 12, color: "var(--err)" }}>{error}</p>}
      {success && <p style={{ marginTop: 10, fontSize: 12, color: "var(--ok)"  }}>{success}</p>}
    </div>
  );
}

function ActionForm({
  label, placeholder, value, onChange, onSubmit, onCancel, tone,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  tone: "err" | "warn";
}) {
  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: "var(--surface)", border: "1px solid var(--line)" }}>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{
          display: "block", width: "100%", marginTop: 6,
          padding: 10, borderRadius: 7,
          border: "1px solid var(--line)", background: "var(--surface)",
          fontSize: 13, lineHeight: 1.5, color: "var(--text)",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onSubmit} style={btnStyle(tone)}>Confirm</button>
        <button type="button" onClick={onCancel} style={btnStyle("muted")}>Cancel</button>
      </div>
    </div>
  );
}

function btnStyle(tone: "ok" | "err" | "warn" | "muted"): React.CSSProperties {
  const map = {
    ok:    { bg: "var(--ok)",    fg: "#fff",         border: "transparent" },
    err:   { bg: "var(--err)",   fg: "#fff",         border: "transparent" },
    warn:  { bg: "var(--warn)",  fg: "#fff",         border: "transparent" },
    muted: { bg: "var(--surface)", fg: "var(--text)", border: "var(--line)" },
  };
  const t = map[tone];
  return {
    minHeight: 38, padding: "0 14px", borderRadius: 9,
    background: t.bg, color: t.fg,
    border: `1px solid ${t.border}`,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}
