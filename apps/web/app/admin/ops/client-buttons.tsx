"use client";

import { useState, useTransition } from "react";
import { Play, Loader2, Trash2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { triggerCron, resetLlmDeadKey, clearFailedBackgroundJobs, type CronKey } from "@/lib/admin/actions/ops";

interface ToastState {
  ok:  boolean;
  msg: string;
}

export function CronButton({ cronKey, label }: { cronKey: CronKey; label: string }) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);

  return (
    <div className="space-y-2">
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
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {pending ? "Running…" : label}
      </button>
      {toast && (
        <p className={`flex items-start gap-1 text-[11px] ${toast.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {toast.ok ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
          <span className="break-words">{toast.msg}</span>
        </p>
      )}
    </div>
  );
}

export function ResetDeadKeyButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Reset dead key ${label}? It will be eligible for use immediately.`)) return;
        start(() => { resetLlmDeadKey(id); });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      Reset
    </button>
  );
}

export function ClearFailedJobsButton({ failedCount }: { failedCount: number }) {
  const [pending, start] = useTransition();
  if (failedCount === 0) return null;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete ${failedCount} failed background job${failedCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
        start(() => { clearFailedBackgroundJobs(); });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/8 px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      Clear all
    </button>
  );
}
