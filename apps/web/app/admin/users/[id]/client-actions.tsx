"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, Loader2, CheckCircle2, AlertCircle, RefreshCw, ShieldOff } from "lucide-react";
import {
  suspendUser,
  unsuspendUser,
  deleteUser,
  clearResumeParseError,
  type UserActionState,
} from "@/lib/admin/actions/users";

const initialState: UserActionState = { ok: false, message: "" };
const INPUT = "h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function SuspendForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(suspendUser, initialState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Reason for suspension</span>
        <input type="text" name="reason" required placeholder="e.g. spam reports, ToS violation" className={INPUT} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
        {pending ? "Suspending…" : "Suspend user"}
      </button>
      {state.message && (
        <p className={`text-[11px] ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{state.message}</p>
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
      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
      Unsuspend
    </button>
  );
}

export function ReparseButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
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
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {pending ? "Queueing…" : "Clear error & re-parse resume"}
      </button>
      {done && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Re-parse queued. Parser will pick it up on next drain.</p>}
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
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/15"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete user
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs">
        Type <code className="rounded bg-background px-1.5 py-0.5 font-mono">DELETE</code> to permanently erase{" "}
        <strong className="break-all">{email}</strong> and all owned data.
      </p>
      <input type="text" name="confirm" autoComplete="off" required placeholder="DELETE" className={INPUT} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Confirm delete
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
      {state.message && (
        <p className={`flex items-start gap-1 text-[11px] ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {state.ok ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}
