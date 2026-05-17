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
        className="press inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-success transition hover:border-success/50 disabled:opacity-50 focus-ring"
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
      className="press inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-ring"
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
      className="press inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-success/40 hover:text-success disabled:opacity-50 focus-ring"
    >
      <Undo2 className="h-3 w-3" />
      {restored ? "Restored" : "Restore"}
    </button>
  );
}
