"use client";

import { useState, useTransition } from "react";
import { X, Undo2 } from "lucide-react";
import { dismissMatch, restoreMatch } from "./actions";

// Sprint 1 Item 4 — Dismiss / Restore controls.
// Lives inside the parent <Link> on the match card, so every event stops
// propagation + prevents default to avoid navigating away. Optimistic UI:
// the button disables itself + shows an undo affordance immediately on
// click; the server action runs in a transition.

export function DismissButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hidden) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          startTransition(async () => {
            const res = await restoreMatch(jobId);
            if (res.ok) setHidden(false);
            else setError(res.error);
          });
        }}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[11px] font-medium text-emerald-300 transition hover:border-emerald-400/40 disabled:opacity-50"
        aria-label="Restore this role"
      >
        <Undo2 className="h-3 w-3" />
        Restored — undo
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        startTransition(async () => {
          const res = await dismissMatch(jobId);
          if (res.ok) setHidden(true);
          else setError(res.error);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
      title={error ?? "Hide this role from your default list"}
      aria-label="Dismiss this role"
    >
      <X className="h-3 w-3" />
      Dismiss
    </button>
  );
}

// Lightweight restore button for the "Hidden" tab — variant of the same
// flow with a different visual treatment (the row is already greyed out).
export function RestoreButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const [restored, setRestored] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending || restored}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        startTransition(async () => {
          const res = await restoreMatch(jobId);
          if (res.ok) setRestored(true);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-50"
    >
      <Undo2 className="h-3 w-3" />
      {restored ? "Restored" : "Restore"}
    </button>
  );
}
