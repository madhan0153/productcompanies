"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/admin/pm";
import {
  triggerCron, resetLlmDeadKey, clearFailedBackgroundJobs, type CronKey,
} from "@/lib/admin/actions/ops";

interface ToastState { ok: boolean; msg: string }

export function CronButton({ cronKey, label }: { cronKey: CronKey; label: string }) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await triggerCron(cronKey);
            setToast({ ok: res.ok, msg: res.message });
            setTimeout(() => setToast(null), 5000);
          });
        }}
        className="pm-cta"
        style={{ width: "100%" }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {pending ? "Running…" : label}
      </button>
      {toast && (
        <p style={{
          display: "flex", alignItems: "flex-start", gap: 4,
          fontSize: 11, color: toast.ok ? "var(--ok)" : "var(--err)",
        }}>
          {toast.ok ? <CheckCircle2 size={12} style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertCircle size={12} style={{ marginTop: 2, flexShrink: 0 }} />}
          <span style={{ wordBreak: "break-word" }}>{toast.msg}</span>
        </p>
      )}
    </div>
  );
}

export function ResetDeadKeyButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: `Reset dead key ${label}?`,
            body: "It will be eligible for use immediately.",
            confirmLabel: "Reset",
          });
          if (!ok) return;
          start(() => { resetLlmDeadKey(id); });
        }}
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
        Reset
      </button>
      {dialog}
    </>
  );
}

export function ClearFailedJobsButton({ failedCount }: { failedCount: number }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();
  if (failedCount === 0) return null;
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: `Delete ${failedCount} failed job${failedCount === 1 ? "" : "s"}?`,
            body: "This permanently removes the failed background-job rows and cannot be undone.",
            confirmLabel: "Delete all",
            danger: true,
          });
          if (!ok) return;
          start(() => { clearFailedBackgroundJobs(); });
        }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
          background: "var(--err-soft)", color: "var(--err)",
          border: "1px solid color-mix(in oklab, var(--err) 30%, transparent)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <Trash2 size={12} />}
        Clear all
      </button>
      {dialog}
    </>
  );
}
