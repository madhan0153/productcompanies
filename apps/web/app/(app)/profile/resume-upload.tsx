"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Sparkles, Brain, Cpu, TrendingUp, Zap,
} from "lucide-react";
import { uploadAndParseResume, type UploadResult } from "./actions";

type Props = {
  hasExisting: boolean;
  existingRole?: string | null;
  existingDnaScore?: number | null;
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

export function ResumeUpload({ hasExisting, existingRole, existingDnaScore }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const router = useRouter();

  function onFile(file: File) {
    if (file.type !== "application/pdf") {
      setResult({ ok: false, error: "Only PDF files are supported." });
      return;
    }
    setFileName(file.name);
    setResult(null);
    setCurrentStep(0);

    // Animate through steps while actual upload runs
    if (!reduce) {
      let step = 0;
      const advance = () => {
        step++;
        if (step < AI_STEPS.length) {
          setCurrentStep(step);
          setTimeout(advance, AI_STEPS[step]?.duration ?? 4000);
        }
      };
      setTimeout(advance, AI_STEPS[0]?.duration ?? 3000);
    }

    const fd = new FormData();
    fd.append("resume", file);
    startTransition(async () => {
      const r = await uploadAndParseResume(fd);
      setResult(r);
      setCurrentStep(-1);
      if (r.ok) router.refresh();
    });
  }

  const isProcessing = pending && currentStep >= 0;

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
            className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-6"
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
                      isDone ? "bg-emerald-400/20 text-emerald-400" :
                      isActive ? "bg-primary/20 text-primary" :
                      "bg-secondary/50 text-muted-foreground/40"
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
                className="h-1 rounded-full bg-gradient-to-r from-primary to-fuchsia-400"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(((currentStep + 1) / AI_STEPS.length) * 100, 95)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Usually takes 15–30 seconds · Powered by Gemini 2.0
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
              onClick={() => inputRef.current?.click()}
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
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              aria-label="Upload resume PDF"
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-12 transition",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/40 hover:bg-secondary/20",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                dragging ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"
              }`}>
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {hasExisting ? "Replace your resume" : "Upload your resume"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drag & drop or click to browse · PDF only · max 5 MB
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-primary" /> AI-parsed by Gemini</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> DNA score computed</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result banner */}
      <AnimatePresence>
        {result && !pending && (
          <motion.div
            initial={reduce ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={[
              "flex items-start gap-3 rounded-xl border p-4",
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-destructive/30 bg-destructive/5 text-destructive",
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
                  <p className="font-semibold text-emerald-300">Resume parsed successfully!</p>
                  <p className="mt-1 text-xs text-emerald-400/80">
                    Role: {result.role} · {result.years}y exp · {result.techCount} technologies detected
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-400/80">
                    Product DNA score: <strong>{result.dnaScore}/100</strong>
                  </p>
                  <a
                    href="/matches"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <Zap className="h-3 w-3" /> Compute matches now
                  </a>
                </>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing resume badge */}
      {hasExisting && !result?.ok && !pending && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Current: <strong className="text-foreground">{existingRole ?? "Detected from resume"}</strong>
            {existingDnaScore != null && (
              <> · DNA score: <strong className="text-primary">{existingDnaScore}/100</strong></>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
