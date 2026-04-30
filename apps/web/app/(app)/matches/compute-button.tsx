"use client";

import { useTransition, useState, useEffect } from "react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeMatches, type ComputeMatchesResult } from "./actions";

// Approximate progress while the server action runs. The server can't stream
// progress easily, so we simulate a smooth fill that maxes at 95% until the
// action returns. Beats a stale spinner with no feedback.
const ESTIMATED_DURATION_MS = 18_000;

export function ComputeButton({ hasResume }: { hasResume: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ComputeMatchesResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (!pending) {
      setProgress(0);
      setPhase("");
      return;
    }
    const startedAt = Date.now();
    const phases = [
      [0, "Loading your profile…"],
      [10, "Pulling active roles across 18 companies…"],
      [30, "Scoring with rules engine…"],
      [60, "Generating AI explanations…"],
      [85, "Saving matches…"],
    ] as const;

    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / ESTIMATED_DURATION_MS, 0.95);
      const pct = Math.round(ratio * 100);
      setProgress(pct);
      const cur = [...phases].reverse().find(([p]) => pct >= p);
      if (cur) setPhase(cur[1]);
    }, 200);

    return () => clearInterval(tick);
  }, [pending]);

  function handleClick() {
    setResult(null);
    const t = toast.loading("Computing your matches…", {
      description: "This usually takes 10–30 seconds.",
    });
    start(async () => {
      const r = await computeMatches();
      setProgress(100);
      setResult(r);
      toast.dismiss(t);
      if (r.ok) {
        toast.success(`${r.total} jobs scored`, {
          description: `${r.withExplanations} matches received AI explanations.`,
        });
        router.refresh();
      } else {
        toast.error("Could not compute matches", { description: r.error });
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={pending || !hasResume}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing… {progress}%
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {result?.ok ? "Recompute matches" : "Compute my matches"}
          </>
        )}
      </button>

      {pending && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-gradient-to-r from-primary to-fuchsia-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">{phase}</p>
        </div>
      )}

      {result && !pending && !result.ok && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.error}</span>
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
