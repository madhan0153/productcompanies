"use client";

import { useState, useTransition } from "react";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { recordApplyClick } from "@/app/(app)/jobs/[id]/actions";

// Sprint 2 — Items 9 + 10.
//
// Multi-purpose Apply CTA:
//   - opens the official apply URL in a new tab,
//   - records the click (increments apply_click_count),
//   - upserts an "applied" application row if one doesn't already exist.
//
// Used inside the matches card (which is itself a <Link>) and on the job
// detail page. Inside a Link we must e.preventDefault()/stopPropagation()
// so the outer navigation doesn't swallow our click. The actual external
// navigation happens via window.open with `noopener,noreferrer`.

interface Props {
  jobId: string;
  applyUrl: string | null;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function ApplyButton({ jobId, applyUrl, variant = "default", className = "" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState<"new" | "existing" | null>(null);

  if (!applyUrl) {
    return null;
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Open the URL synchronously — popup blockers ignore window.open calls
    // that happen after await. Tracking fires asynchronously below.
    const win = window.open(applyUrl ?? undefined, "_blank", "noopener,noreferrer");
    if (!win) {
      // Fallback if the browser refused the popup.
      window.location.href = applyUrl ?? "#";
    }
    startTransition(async () => {
      const res = await recordApplyClick(jobId);
      if (res.ok) setConfirmed(res.created ? "new" : "existing");
    });
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1 text-current transition hover:text-primary disabled:opacity-60 ${className}`}
      >
        {confirmed === "new" ? "Tracked as applied" : confirmed === "existing" ? "Reopened" : "Apply on official site"}
        {confirmed ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <ExternalLink className="h-3 w-3" />}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-card disabled:opacity-60 ${className}`}
      >
        {confirmed === "new" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <ExternalLink className="h-3.5 w-3.5" />}
        {confirmed === "new" ? "Tracked as applied" : confirmed === "existing" ? "Reopened — already tracked" : "Apply"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-60 ${className}`}
    >
      {confirmed === "new" ? <CheckCircle2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
      {confirmed === "new" ? "Tracked — opened apply page" : confirmed === "existing" ? "Reopened apply page" : "Apply on official site"}
    </button>
  );
}
