"use client";

import { useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadAndParseResume, type UploadResult } from "./actions";

type Props = {
  hasExisting: boolean;
  existingRole?: string | null;
  existingDnaScore?: number | null;
};

export function ResumeUpload({ hasExisting, existingRole, existingDnaScore }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  function onFile(file: File) {
    if (file.type !== "application/pdf") {
      setResult({ ok: false, error: "Only PDF files are supported." });
      return;
    }
    setFileName(file.name);
    setResult(null);
    const fd = new FormData();
    fd.append("resume", file);
    startTransition(async () => {
      const r = await uploadAndParseResume(fd);
      setResult(r);
    });
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30",
          pending ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {pending ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Parsing with Gemini AI…</p>
            <p className="text-xs text-muted-foreground">This takes 5–15 seconds</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {fileName ?? (hasExisting ? "Replace your resume" : "Upload your resume")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">PDF · max 5 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Result banner */}
      {result && !pending && (
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={[
            "flex items-start gap-3 rounded-xl border p-4",
            result.ok
              ? "border-green-500/30 bg-green-500/5 text-green-400"
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
                <p className="font-medium">Resume parsed successfully!</p>
                <p className="mt-1 text-xs opacity-80">
                  Role: {result.role} · {result.years}y exp · {result.techCount} technologies · DNA score: {result.dnaScore}/100
                </p>
                <a href="/matches" className="mt-2 inline-block text-xs font-medium underline underline-offset-2">
                  Compute my matches →
                </a>
              </>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Existing resume indicator */}
      {hasExisting && !result?.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-4 py-2.5 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" />
          <span>
            Current: {existingRole ?? "Role parsed from resume"} · DNA score: {existingDnaScore ?? "—"}/100
          </span>
        </div>
      )}
    </div>
  );
}
