"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeMatches, getLastMatchComputeAt, type ComputeMatchesResult } from "./actions";

// Sprint 2 Item 5 — async compute UX.
//
// The server action returns immediately with `queued: true`. We then poll
// `last_match_compute_at` every 5s until it ticks forward, which signals
// the background compute has finished. On detection we router.refresh()
// so the new matches surface without another full nav.
//
// Polling is bounded to ~120s — beyond that the background job is either
// stuck or the user's network can't load the result; we degrade to a
// "Still running — refresh manually" affordance instead of spinning forever.

const POLL_INTERVAL_MS  = 5_000;
const POLL_BUDGET_MS    = 120_000;
const PROGRESS_DURATION = 35_000;   // visual fill — caps at 95% until done

export function ComputeButton({ hasResume }: { hasResume: boolean }) {
  const [pending, start] = useTransition();
  const [queued, setQueued] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const baselineRef = useRef<string | null>(null);
  const router = useRouter();

  // Smooth visual progress for the queued phase.
  useEffect(() => {
    if (!queued) { setProgress(0); return; }
    const t0 = Date.now();
    const tick = setInterval(() => {
      const ratio = Math.min((Date.now() - t0) / PROGRESS_DURATION, 0.95);
      setProgress(Math.round(ratio * 100));
    }, 250);
    return () => clearInterval(tick);
  }, [queued]);

  // Poll for completion when queued.
  useEffect(() => {
    if (!queued) return;
    const pollStart = Date.now();

    const interval = setInterval(async () => {
      const ts = await getLastMatchComputeAt();
      // First poll establishes the baseline timestamp; subsequent polls
      // detect movement.
      if (baselineRef.current === null) {
        baselineRef.current = ts ?? "0";
        return;
      }
      if (ts && ts !== baselineRef.current) {
        clearInterval(interval);
        setProgress(100);
        setDone(true);
        setQueued(false);
        toast.success("Matches refreshed", {
          description: "Top roles re-ranked from this morning's catalog.",
        });
        router.refresh();
        return;
      }
      if (Date.now() - pollStart > POLL_BUDGET_MS) {
        clearInterval(interval);
        setQueued(false);
        setError("Still running in the background. Refresh this page in a moment to see updated matches.");
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [queued, router]);

  function handleClick() {
    setError(null);
    setDone(false);
    baselineRef.current = null;
    start(async () => {
      const r: ComputeMatchesResult = await computeMatches();
      if (!r.ok) {
        setError(r.error);
        toast.error("Could not start compute", { description: r.error });
        return;
      }
      setQueued(true);
      toast("Recomputing matches", {
        description: "Running in the background — top fits will refresh in ~30s.",
      });
    });
  }

  const buttonState = pending ? "starting" : queued ? "running" : done ? "done" : "idle";

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={pending || queued || !hasResume}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonState === "starting" || buttonState === "running" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {buttonState === "starting" ? "Queueing…" : `Recomputing… ${progress}%`}
          </>
        ) : buttonState === "done" ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Updated — recompute again
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Compute my matches
          </>
        )}
      </button>

      {queued && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-gradient-to-r from-primary to-fuchsia-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Running in the background — you can keep scrolling. Top fits refresh when ready.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!hasResume && (
        <p className="text-xs text-muted-foreground">
          <a href="/profile" className="underline underline-offset-2 hover:text-foreground">Upload your resume</a> first to compute matches.
        </p>
      )}
    </div>
  );
}
