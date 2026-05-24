"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { generateTailoredResumeDownload } from "../tailor-actions";

interface Props {
  jobId: string;
  quotaUsed: number;
  quotaLimit: number;
  quotaExhausted: boolean;
  mustHaves: string[];
}

export function TailorEntry({ jobId, quotaUsed, quotaLimit, quotaExhausted, mustHaves }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<{ pdf: string; docx: string; print: string } | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateTailoredResumeDownload(jobId);
      if (!res.ok) {
        setError(res.error);
        return;
      }

      setUrls({ pdf: res.pdf_url, docx: res.docx_url, print: res.print_url });
      window.open(res.pdf_url, "_blank", "noopener,noreferrer");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold sm:text-lg">Generate tailored resume</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          One click creates a JD-matched PDF and editable DOCX. ProdMatch only auto-applies safe, evidence-backed edits and leaves risky suggestions unchanged.
        </p>

        {mustHaves.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              JD must-haves driving the tailoring
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mustHaves.slice(0, 12).map((s) => (
                <span key={s} className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11px]">
                  {s}
                </span>
              ))}
              {mustHaves.length > 12 && (
                <span className="rounded-md border border-dashed border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{mustHaves.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          <p>
            The generated resume is cached for this JD and your current resume version, so repeat downloads do not spend extra AI calls.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {quotaUsed} / {quotaLimit} tailored resumes used this 30-day window.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={pending || quotaExhausted}
            className="press tap-target inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Generating PDF and DOCX...
              </>
            ) : (
              <>
                {urls ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {urls ? "Regenerate" : "Generate & download"}
              </>
            )}
          </button>
        </div>

        {urls && (
          <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
            <a
              href={urls.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Download PDF
            </a>
            <a
              href={urls.docx}
              target="_blank"
              rel="noopener noreferrer"
              className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary focus-ring"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Download DOCX
            </a>
            <a
              href={`${urls.print}?autoprint=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary focus-ring"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Browser PDF
            </a>
          </div>
        )}

        {quotaExhausted && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>You&apos;ve used your monthly tailored resume quota. Window resets a few weeks from your first run.</p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
