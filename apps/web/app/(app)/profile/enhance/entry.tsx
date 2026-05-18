"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { diagnoseEnhancement } from "../enhance-actions";

interface Props {
  quotaUsed: number;
  quotaLimit: number;
  quotaExhausted: boolean;
  roleFunction: string | null;
}

export function EnhanceEntry({ quotaUsed, quotaLimit, quotaExhausted, roleFunction }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await diagnoseEnhancement();
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold sm:text-lg">What we&apos;ll check</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>ATS-readability — section structure, date formatting, character hygiene.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>Bullet quality — weak verbs, passive voice, missing measurements.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>Keyword coverage for {roleFunction ? <strong className="text-foreground">{roleFunction.replace(/_/g, " ")}</strong> : "your target role"}.</span>
          </li>
        </ul>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          <p>
            For each weak bullet, we propose 1-3 alternative phrasings. You review every change.
            <strong className="text-foreground"> No fact is added that isn&apos;t already in your resume.</strong>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {quotaUsed} / {quotaLimit} enhancements used this 30-day window.
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
                Analysing your resume…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Run diagnosis
              </>
            )}
          </button>
        </div>

        {quotaExhausted && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>You&apos;ve used your monthly enhancements. The window resets a few weeks from your first run.</p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>{error}</p>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Diagnosis typically takes 8–15 seconds. We&apos;ll guide you through reviewing each
        suggestion. You can save a draft and come back later.
      </p>
    </div>
  );
}
