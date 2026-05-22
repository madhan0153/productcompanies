"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Sparkles, Brain, Cpu, TrendingUp, Zap,
} from "lucide-react";
import { uploadAndParseResume, getParseStatus, type UploadResult, type ParseStatus } from "./actions";

type Props = {
  hasExisting: boolean;
  existingRole?: string | null;
  existingDnaScore?: number | null;
  isParsing?: boolean;
};

// Simulated AI processing steps shown during upload
const AI_STEPS = [
  { icon: FileText,  label: "Parsing PDF resume",             duration: 3000 },
  { icon: Brain,     label: "Detecting seniority & role",     duration: 4000 },
  { icon: Cpu,       label: "Understanding tech stack",        duration: 4000 },
  { icon: Sparkles,  label: "Computing semantic embeddings",   duration: 5000 },
  { icon: TrendingUp, label: "Matching against 18 companies", duration: 5000 },
  { icon: Zap,       label: "Generating Fit Cards",           duration: 4000 },
];

// Client-visible result shape — derived from UploadResult + poll outcomes.
type DisplayResult =
  | { ok: true; dnaScore: number; role: string; years: number; techCount: number }
  | { ok: false; error: string; retryable?: boolean };

function formatUploadFailure(err: unknown): { error: string; retryable: boolean } {
  const message = err instanceof Error ? err.message : "";
  if (/unexpected response|failed to fetch|network|aborted/i.test(message)) {
    return {
      error: "The server took too long to respond. Please retry.",
      retryable: true,
    };
  }
  if (/server components render|minified react error #418|textArgs/i.test(message)) {
    return {
      error: "We could not refresh your profile after starting the new parse. Your previous resume is still active. Please refresh once and try again.",
      retryable: true,
    };
  }
  return {
    error: message || "Couldn't upload your resume. Please retry.",
    retryable: true,
  };
}

export function ResumeUpload({ hasExisting, existingRole, existingDnaScore, isParsing = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  // pollingStartedAt: set when the upload action returns processing=true.
  // We poll getParseStatus() while this is set; clear it on terminal state.
  const [pollingStartedAt, setPollingStartedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const router = useRouter();

  function resetFileInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function startStepAnimation() {
    setCurrentStep(0);
    if (reduce) return;
    let step = 0;
    const advance = () => {
      step++;
      if (step < AI_STEPS.length) {
        setCurrentStep(step);
        setTimeout(advance, AI_STEPS[step]?.duration ?? 4000);
      } else {
        // Park on the final step so the UI doesn't snap back during the
        // poll wait. The "running…" pulse keeps it from looking frozen.
        setCurrentStep(AI_STEPS.length - 1);
      }
    };
    setTimeout(advance, AI_STEPS[0]?.duration ?? 3000);
  }

  function onFile(file: File) {
    if (isParsing) {
      setResult({ ok: false, error: "Resume parsing is already in progress. Please wait for it to finish." });
      resetFileInput();
      return;
    }
    if (file.type !== "application/pdf") {
      setResult({ ok: false, error: "Only PDF files are supported." });
      resetFileInput();
      return;
    }
    setFileName(file.name);
    setResult(null);
    setPollingStartedAt(null);
    startStepAnimation();

    const fd = new FormData();
    fd.append("resume", file);
    startTransition(async () => {
      try {
        const r: UploadResult = await uploadAndParseResume(fd);
        if (r.ok) {
          // Upload + storage write succeeded; parse is running in after().
          // The poll effect below will watch for completion. A soft refresh
          // here is best-effort only; the upload must not look failed if the
          // refreshed Server Component tree hits a transient render issue.
          setPollingStartedAt(r.startedAt);
          try {
            router.refresh();
          } catch {
            // Polling remains the source of truth for this in-tab flow.
          }
        } else {
          setCurrentStep(-1);
          resetFileInput();
          setResult({ ok: false, error: r.error, retryable: r.retryable });
        }
      } catch (err) {
        // Universal recovery — any thrown error (RSC payload error, hydration
        // mismatch, network blip, etc.) is treated as a possible "action
        // committed DB writes but response was broken." Probe the canonical
        // DB-backed status: if parsing actually kicked off, we are NOT failed.
        // This is the only reliable way to tell a successful upload (where
        // the response failed during revalidation) apart from a real failure.
        console.error("resume upload action threw:", err);
        try {
          const status = await getParseStatus();
          if (status.state === "parsing") {
            setPollingStartedAt(status.startedAt);
            return;
          }
          if (status.state === "done") {
            setCurrentStep(-1);
            setResult({
              ok: true,
              dnaScore: status.dnaScore,
              role: status.role,
              years: status.years,
              techCount: status.techCount,
            });
            return;
          }
          if (status.state === "failed") {
            setCurrentStep(-1);
            resetFileInput();
            setResult({ ok: false, error: status.error, retryable: true });
            return;
          }
        } catch {
          // Fall through to the generic failure UI if the status probe also
          // fails (e.g. the user is offline). The original action error is
          // logged above for diagnostics.
        }
        setCurrentStep(-1);
        resetFileInput();
        const failure = formatUploadFailure(err);
        setResult({ ok: false, ...failure });
      }
    });
  }

  // Poll the server every ~3s while parsing. Stop on terminal state, or
  // after 3 min hard cap (something's badly wrong if the parse takes that
  // long; user can retry).
  useEffect(() => {
    if (!pollingStartedAt) return;
    let cancelled = false;
    const HARD_CAP_MS = 3 * 60 * 1000;
    const startMs = Date.now();

    async function tick() {
      if (cancelled) return;
      let status: ParseStatus;
      try {
        status = await getParseStatus();
      } catch {
        status = { state: "parsing", startedAt: pollingStartedAt! };
      }
      if (cancelled) return;

      // If the row reports a different (or absent) parsing_at, the
      // background work has either finished or failed.
      if (status.state === "done") {
        setCurrentStep(-1);
        setPollingStartedAt(null);
        setResult({
          ok: true,
          dnaScore: status.dnaScore,
          role: status.role,
          years: status.years,
          techCount: status.techCount,
        });
        router.refresh();
        return;
      }
      if (status.state === "failed") {
        setCurrentStep(-1);
        setPollingStartedAt(null);
        resetFileInput();
        setResult({ ok: false, error: status.error, retryable: true });
        return;
      }
      if (Date.now() - startMs > HARD_CAP_MS) {
        setCurrentStep(-1);
        setPollingStartedAt(null);
        resetFileInput();
        setResult({
          ok: false,
          error: "Parsing is taking unusually long. Refresh the page in a minute to see if it finished, or re-upload.",
          retryable: true,
        });
        return;
      }
      setTimeout(tick, 3000);
    }
    // Kick off after a 2s grace so we don't hammer the row immediately —
    // the parse takes 10s+ even on a warm path, polling sooner is wasted.
    const initial = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [pollingStartedAt, router]);

  const isProcessing = (pending || pollingStartedAt !== null) && currentStep >= 0;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={reduce ? {} : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-xl border border-primary/30 bg-primary-soft p-5 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Processing your resume</p>
                <p className="text-xs text-muted-foreground">{fileName}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </div>

            {/* Progress timeline */}
            <div className="space-y-3">
              {AI_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = i < currentStep;
                const isActive = i === currentStep;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                      isDone ? "bg-success/15 text-success" :
                      isActive ? "bg-primary-soft text-primary-soft-foreground" :
                      "bg-secondary text-muted-foreground/50"
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "animate-pulse" : ""}`} />
                      )}
                    </div>
                    <span className={`text-xs transition-all ${
                      isDone ? "text-muted-foreground line-through" :
                      isActive ? "font-medium text-foreground" :
                      "text-muted-foreground/40"
                    }`}>
                      {step.label}
                    </span>
                    {isActive && !reduce && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="ml-auto text-[10px] text-primary"
                      >
                        running…
                      </motion.span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-5 overflow-hidden rounded-full bg-secondary/60">
              <motion.div
                className="h-1 rounded-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(((currentStep + 1) / AI_STEPS.length) * 100, 95)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {pollingStartedAt
                ? "Saved — our AI is finishing the parse in the background. You can leave this page; we'll keep your spot."
                : "Usually takes 15–30 seconds"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={reduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onClick={() => { if (!isParsing) inputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) onFile(f);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (!isParsing && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
              aria-label="Upload resume PDF"
              className={[
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-6 transition",
                isParsing ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                dragging
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                dragging ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {isParsing ? "Resume parse in progress…" : hasExisting ? "Replace your resume" : "Upload your resume"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isParsing ? "Please wait — we'll refresh this page automatically once parsing completes." : "Drag & drop or click · PDF only · max 5 MB"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-primary" /> AI-parsed</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Readiness scored</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result banner */}
      <AnimatePresence>
        {result && !pending && (
          (() => {
            const failedWithFallback = !result.ok && hasExisting;
            const tone = result.ok
              ? "border-success/30 bg-success/5 text-success"
              : failedWithFallback
                ? "border-warning/30 bg-warning/5 text-warning"
                : "border-destructive/30 bg-destructive/5 text-destructive";
            const mutedTone = result.ok
              ? "text-success/80"
              : failedWithFallback
                ? "text-warning/85"
                : "text-destructive/80";
            const buttonTone = failedWithFallback
              ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15"
              : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15";

            return (
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={[
              "flex items-start gap-3 rounded-xl border p-4",
              tone,
            ].join(" ")}
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div className="text-sm">
              {result.ok ? (
                <>
                  <p className="font-semibold text-success">Resume parsed successfully!</p>
                  <p className="mt-1 text-xs text-success/80">
                    Role: {result.role} · {result.years}y exp · {result.techCount} technologies detected
                  </p>
                  <p className="mt-0.5 text-xs text-success/80">
                    Product-Co Readiness: <strong>{result.dnaScore}/100</strong>
                  </p>
                  <Link
                    href="/matches"
                    className="press tap-target-sm mt-3 inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition hover:bg-success/20 focus-ring"
                  >
                    <Zap className="h-3 w-3" /> Compute matches now
                  </Link>
                </>
              ) : (
                <>
                  {failedWithFallback && (
                    <p className="font-semibold">Previous resume is still active</p>
                  )}
                  <p>{result.error}</p>
                  {failedWithFallback && (
                    <p className={`mt-1 text-xs ${mutedTone}`}>
                      Matches and profile data continue using your last successfully parsed resume.
                    </p>
                  )}
                  {result.retryable && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className={`tap-target-sm mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition focus-ring ${buttonTone}`}
                    >
                      <Upload className="h-3 w-3" /> Choose PDF again
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
            );
          })()
        )}
      </AnimatePresence>

      {/* Existing resume badge */}
      {hasExisting && !result?.ok && !pending && !pollingStartedAt && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Current: <strong className="text-foreground">{existingRole ?? "Detected from resume"}</strong>
            {existingDnaScore != null && (
              <> · Readiness: <strong className="text-primary">{existingDnaScore}/100</strong></>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
