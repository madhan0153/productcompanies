"use client";

// Compute flow split into 3 composable pieces:
//   ComputeProvider  — context, state, polling (wraps the page)
//   ComputeTrigger   — compact pill button for the header
//   ComputeStatusBanner — full-width card shown below the header while running / on timeout
//
// This separates the running/error UI from the header row so it never
// overlaps or overflows the sticky band strip on mobile.

import {
  useTransition, useState, useEffect, useRef,
  createContext, useContext,
} from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { computeMatches, getLastMatchComputeAt, type ComputeMatchesResult } from "./actions";

const POLL_INTERVAL_MS  = 5_000;
const POLL_BUDGET_MS    = 120_000;
const PROGRESS_DURATION = 35_000; // visual fill caps at 95% until done

type Phase = "idle" | "starting" | "running" | "done" | "timeout";

type ComputeCtx = {
  phase: Phase;
  progress: number;
  error: string | null;
  trigger: () => void;
  dismiss: () => void;
  hasResume: boolean;
};

const Ctx = createContext<ComputeCtx | null>(null);

function useCompute() {
  const c = useContext(Ctx);
  if (!c) throw new Error("Must be inside ComputeProvider");
  return c;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ComputeProvider({
  hasResume,
  children,
}: {
  hasResume: boolean;
  children: React.ReactNode;
}) {
  const [pending, startPending] = useTransition();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef<string | null>(null);
  const router = useRouter();

  const isRunning = phase === "running";

  // Smooth visual fill while running.
  useEffect(() => {
    if (!isRunning) { setProgress(0); return; }
    const t0 = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.round(Math.min((Date.now() - t0) / PROGRESS_DURATION, 0.95) * 100));
    }, 250);
    return () => clearInterval(tick);
  }, [isRunning]);

  // Poll last_match_compute_at until it ticks forward.
  useEffect(() => {
    if (!isRunning) return;
    const pollStart = Date.now();
    const interval = setInterval(async () => {
      const ts = await getLastMatchComputeAt();
      if (baselineRef.current === null) { baselineRef.current = ts ?? "0"; return; }
      if (ts && ts !== baselineRef.current) {
        clearInterval(interval);
        setProgress(100);
        setPhase("done");
        toast.success("Matches refreshed", { description: "Top roles re-ranked from the latest catalog." });
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
    setError(null);
    baselineRef.current = null;
    startPending(async () => {
      const r: ComputeMatchesResult = await computeMatches();
      if (!r.ok) {
        setError(r.error);
        toast.error("Could not start compute", { description: r.error });
        return;
      }
      setPhase("running");
      toast("Recomputing matches", { description: "Running in the background — results auto-refresh when ready." });
    });
  };

  const dismiss = () => { setPhase("idle"); setError(null); };

  // pending=true while the server action is in flight (the "starting" phase).
  const effectivePhase: Phase = pending ? "starting" : phase;

  return (
    <Ctx.Provider value={{ phase: effectivePhase, progress, error, trigger, dismiss, hasResume }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Trigger — compact pill button, lives in the page header ──────────────────

export function ComputeTrigger() {
  const { phase, progress, trigger, hasResume } = useCompute();
  const busy = phase === "starting" || phase === "running";

  return (
    <button
      onClick={trigger}
      disabled={busy || !hasResume}
      aria-label="Compute my matches"
      className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
    >
      {phase === "starting" ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> Queueing…</>
      ) : phase === "running" ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> {progress}%</>
      ) : phase === "done" ? (
        <><CheckCircle2 className="h-3 w-3 text-success" /> Updated</>
      ) : (
        <><Sparkles className="h-3 w-3" /> Compute</>
      )}
    </button>
  );
}

// ─── Status banner — full-width card below the header ─────────────────────────

export function ComputeStatusBanner() {
  const { phase, progress, error, dismiss } = useCompute();

  if (phase === "running") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary-soft p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Computing your matches</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Running in the background — keep scrolling. Results auto-refresh when ready.
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

  if ((phase === "timeout" || phase === "idle") && error) {
    const isTimeout = phase === "timeout";
    return (
      <div className={`flex items-start gap-3 rounded-xl border p-4 ${
        isTimeout ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"
      }`}>
        <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isTimeout ? "text-warning" : "text-destructive"}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isTimeout ? "text-warning" : "text-destructive"}`}>
            {isTimeout ? "Still running in the background" : "Could not start compute"}
          </p>
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
