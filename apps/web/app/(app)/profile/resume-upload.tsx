"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Sparkles, Brain, Cpu,
} from "lucide-react";
import { uploadAndParseResume, getParseStatus, type UploadResult, type ParseStatus } from "./actions";

type Props = {
  hasExisting: boolean;
  existingRole?: string | null;
  existingDnaScore?: number | null;
  isParsing?: boolean;
};

// Client-side size gates — mirror the server's MAX/MIN in
// lib/security/pdf.ts so oversized files fail before any bytes upload.
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MIN_PDF_BYTES = 4 * 1024;

// Simulated AI processing steps shown during upload
const AI_STEPS = [
  { icon: Upload,    label: "Uploading PDF securely",          duration: 1500 },
  { icon: FileText,  label: "Validating resume file",          duration: 2000 },
  { icon: Brain,     label: "Parsing experience and skills",   duration: 5000 },
  { icon: Cpu,       label: "Preparing review draft",          duration: 4000 },
  { icon: Sparkles,  label: "Opening review form",             duration: 3000 },
];

// Client-visible result shape — derived from UploadResult + poll outcomes.
type DisplayResult =
  | { ok: true; dnaScore: number; role: string; years: number; techCount: number; reviewRequired?: boolean }
  | { ok: false; error: string; retryable?: boolean };

function formatUploadFailure(err: unknown): { error: string; retryable: boolean } {
  const message = err instanceof Error ? err.message : "";
  if (/unexpected response|failed to fetch|network|aborted|too long/i.test(message)) {
    return {
      error: "Your connection dropped during upload. Check your network and tap retry — your previous resume is untouched.",
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

  // Advances the step *state* for everyone — reduced-motion users still get
  // live progress information; only the decorative animation (pulse, shimmer,
  // eased bar) is suppressed via `reduce` / motion-reduce at render time.
  function startStepAnimation() {
    setCurrentStep(0);
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
    // Advisory pre-checks mirroring the server's limits (the server re-validates
    // authoritatively, including PDF magic bytes). Rejecting here means an
    // oversized file fails instantly instead of after a full upload on mobile
    // data. Some Android file pickers report an empty/octet-stream MIME for
    // real PDFs, so fall back to the file extension in that case.
    const looksLikePdf =
      file.type === "application/pdf" ||
      ((file.type === "" || file.type === "application/octet-stream") && /\.pdf$/i.test(file.name));
    if (!looksLikePdf) {
      setResult({ ok: false, error: "Only PDF files are supported.", retryable: true });
      resetFileInput();
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setResult({
        ok: false,
        error: "File too large — max 5 MB. Export a compressed PDF and try again.",
        retryable: true,
      });
      resetFileInput();
      return;
    }
    if (file.size < MIN_PDF_BYTES) {
      setResult({
        ok: false,
        error: "This PDF is too small to be a real resume. Re-export it and try again.",
        retryable: true,
      });
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
      // Probe the canonical DB-backed status after a thrown POST. A flaky 3G
      // POST can commit server-side yet drop the response; this tells the two
      // apart so we never falsely show a failure (or double-upload).
      //   "adopted" — an in-flight/done/failed state was found and surfaced.
      //   "retry"   — server confirmed nothing committed → safe to re-POST.
      //   "unknown" — probe itself failed (offline); don't re-POST blindly.
      const probeAfterError = async (): Promise<"adopted" | "retry" | "unknown"> => {
        for (let i = 0; i < 2; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const status = await getParseStatus();
            if (status.state === "parsing") {
              setPollingStartedAt(status.startedAt);
              return "adopted";
            }
            if (status.state === "done") {
              // Parse already finished server-side — go straight to review.
              setPollingStartedAt(null);
              router.replace("/profile/resume");
              return "adopted";
            }
            if (status.state === "failed") {
              setCurrentStep(-1);
              resetFileInput();
              setResult({ ok: false, error: status.error, retryable: true });
              return "adopted";
            }
            // state === "idle" → nothing committed; a re-POST is safe.
            return "retry";
          } catch {
            // Network blip on the probe itself — keep trying within the loop.
          }
        }
        return "unknown";
      };

      // Probe-gated retry-with-backoff on the initial POST (max 2 attempts).
      for (let attempt = 1; ; attempt++) {
        try {
          const r: UploadResult = await uploadAndParseResume(fd);
          if (r.ok) {
            // Upload + storage write succeeded; parse runs in after(). The poll
            // effect watches for completion. router.refresh() is best-effort —
            // the upload must not look failed if the refreshed Server Component
            // tree hits a transient render issue.
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
          return;
        } catch (err) {
          console.error("resume upload action threw:", err);
          const outcome = await probeAfterError();
          if (outcome === "adopted") return;
          // Server confirmed nothing committed → retry the POST once. The
          // server's idempotency key + active-job guard make a same-file
          // re-POST safe even in the rare race where the first did commit.
          if (outcome === "retry" && attempt < 2) continue;
          // Exhausted retries, or probe couldn't confirm state (offline).
          setCurrentStep(-1);
          resetFileInput();
          const failure = formatUploadFailure(err);
          setResult({ ok: false, ...failure });
          return;
        }
      }
    });
  }

  // Poll the server every ~3s while parsing. Stop on terminal state, or
  // after 3 min hard cap (something's badly wrong if the parse takes that
  // long; user can retry).
  useEffect(() => {
    if (!pollingStartedAt) return;
    let cancelled = false;
    const HARD_CAP_MS = 16 * 60 * 1000;
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
        // Smooth hand-off: instead of showing a second "finished" banner here
        // (the profile page also has a "Parsed resume ready" card), take the
        // user straight into the review/edit form. router.replace unmounts this
        // component, so no duplicate success state is shown.
        setPollingStartedAt(null);
        router.replace("/profile/resume");
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
          error: "Resume processing did not finish after its retry window. Refresh once, then replace the PDF if it still shows as failed.",
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
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
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
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "animate-pulse motion-reduce:animate-none" : ""}`} />
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
                transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {pollingStartedAt
                ? "Uploaded — our AI is parsing it now. You can leave this page; we'll keep your spot."
                : "Resume received — uploading securely…"}
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
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-6 transition focus-ring",
                isParsing ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                dragging
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
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
                  <p className="font-semibold text-success">Resume parsed. Review it before matching.</p>
                  <p className="mt-1 text-xs text-success/80">
                    Role: {result.role} · {result.years}y exp · {result.techCount} technologies detected
                  </p>
                  <p className="mt-0.5 text-xs text-success/80">
                    Product-Co Readiness: <strong>{result.dnaScore}/100</strong>
                  </p>
                  <Link
                    href="/profile/resume"
                    className="press tap-target-sm mt-3 inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition hover:bg-success/20 focus-ring"
                  >
                    <FileText className="h-3 w-3" /> Review & edit parsed resume
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {result.retryable && (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className={`tap-target-sm inline-flex items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition focus-ring ${buttonTone}`}
                      >
                        <Upload className="h-3 w-3" /> Choose PDF again
                      </button>
                    )}
                    {/* Editor fallback — an image-only / unreadable PDF will
                        never parse, so never dead-end the user: let them build
                        the resume structurally instead. */}
                    <Link
                      href="/profile/resume"
                      className="tap-target-sm inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-secondary focus-ring"
                    >
                      <FileText className="h-3 w-3" /> Build in the editor instead
                    </Link>
                  </div>
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
