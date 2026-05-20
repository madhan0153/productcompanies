"use client";

import {
  useTransition, useState, useEffect, useRef,
  createContext, useContext,
} from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, X, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeMatches, getMatchComputeStatus, type ComputeMatchesResult } from "./actions";

const POLL_INTERVAL_MS = 5_000;
const POLL_BUDGET_MS = 300_000;
const PROGRESS_DURATION = 35_000;

type Phase = "idle" | "starting" | "running" | "done" | "failed" | "timeout";

type ComputeCtx = {
  phase: Phase;
  progress: number;
  error: string | null;
  trigger: () => void;
  dismiss: () => void;
  hasResume: boolean;
  disabledReason: string;
};

const Ctx = createContext<ComputeCtx | null>(null);

function useCompute() {
  const c = useContext(Ctx);
  if (!c) throw new Error("Must be inside ComputeProvider");
  return c;
}

export function ComputeProvider({
  hasResume,
  disabledReason = "Upload and finish parsing a resume before computing matches.",
  children,
}: {
  hasResume: boolean;
  disabledReason?: string;
  children: React.ReactNode;
}) {
  const [pending, startPending] = useTransition();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const router = useRouter();

  const isRunning = phase === "running";

  useEffect(() => {
    if (!isRunning) {
      setProgress(0);
      return;
    }
    const t0 = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.round(Math.min((Date.now() - t0) / PROGRESS_DURATION, 0.95) * 100));
    }, 250);
    return () => clearInterval(tick);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    const pollStart = Date.now();
    const interval = setInterval(async () => {
      const status = await getMatchComputeStatus(jobIdRef.current);
      if (status.state === "failed") {
        clearInterval(interval);
        setError(status.error);
        setPhase("failed");
        router.refresh();
        return;
      }
      if (status.state === "succeeded") {
        clearInterval(interval);
        setProgress(100);
        setPhase("done");
        toast.success("Matches refreshed", { description: "Top roles re-ranked from your current resume." });
        router.refresh();
        return;
      }
      if (Date.now() - pollStart > POLL_BUDGET_MS) {
        clearInterval(interval);
        setPhase("timeout");
        setError("Still computing in the background. Refresh the page in a moment to see your updated matches.");
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isRunning, router]);

  const trigger = () => {
    if (!hasResume) {
      setError(disabledReason);
      toast.error("Compute is not available yet", { description: disabledReason });
      return;
    }
    setError(null);
    startedAtRef.current = null;
    jobIdRef.current = null;
    startPending(async () => {
      const r: ComputeMatchesResult = await computeMatches();
      if (!r.ok) {
        setError(r.error);
        toast.error("Could not start compute", { description: r.error });
        return;
      }
      startedAtRef.current = r.startedAt;
      jobIdRef.current = r.jobId;
      setPhase("running");
      toast("Recomputing matches", { description: "Running in the background. Results auto-refresh when ready." });
    });
  };

  const dismiss = () => {
    setPhase("idle");
    setError(null);
    jobIdRef.current = null;
  };

  const effectivePhase: Phase = pending ? "starting" : phase;

  return (
    <Ctx.Provider value={{ phase: effectivePhase, progress, error, trigger, dismiss, hasResume, disabledReason }}>
      {children}
    </Ctx.Provider>
  );
}

export function ComputeTrigger() {
  const { phase, progress, trigger, hasResume, disabledReason } = useCompute();
  const busy = phase === "starting" || phase === "running";

  return (
    <button
      onClick={trigger}
      disabled={busy || !hasResume}
      aria-label="Compute my matches"
      title={!hasResume ? disabledReason : "Compute matches from the current resume"}
      className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
    >
      {phase === "starting" ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> Queueing...</>
      ) : phase === "running" ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> {progress}%</>
      ) : phase === "done" ? (
        <><CheckCircle2 className="h-3 w-3 text-success" /> Updated</>
      ) : phase === "failed" ? (
        <><AlertCircle className="h-3 w-3 text-destructive" /> Retry</>
      ) : (
        <><Sparkles className="h-3 w-3" /> Compute</>
      )}
    </button>
  );
}

export function ComputeStatusBanner() {
  const { phase, progress, error, dismiss, trigger, hasResume } = useCompute();
  const router = useRouter();

  if (phase === "running") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary-soft p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Computing your matches</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Running in the background. Keep scrolling; results auto-refresh when ready.
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{progress}%</span>
        </div>
        <div
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-primary/20"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4 sm:flex-row sm:items-start">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Still computing in the background</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            This can take a few minutes for large catalogs. Refresh to see the latest status.
          </p>
        </div>
        <button
          onClick={() => { dismiss(); router.refresh(); }}
          aria-label="Refresh matches"
          className="tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-ring"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">Compute failed</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {error ?? "We could not refresh matches. Please retry when your connection is stable."}
          </p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <button
            onClick={trigger}
            disabled={!hasResume}
            className="tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="tap-target-sm inline-flex items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-ring"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (phase === "idle" && error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">Could not start compute</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded text-muted-foreground transition hover:text-foreground focus-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
