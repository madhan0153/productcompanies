"use client";

import { useTransition, useState } from "react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { computeMatches, type ComputeMatchesResult } from "./actions";

export function ComputeButton({ hasResume }: { hasResume: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ComputeMatchesResult | null>(null);
  const router = useRouter();

  function handleClick() {
    start(async () => {
      const r = await computeMatches();
      setResult(r);
      if (r.ok) router.refresh();
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
            Computing matches…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {result?.ok ? "Recompute matches" : "Compute my matches"}
          </>
        )}
      </button>

      {result && !pending && (
        <div className={[
          "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
          result.ok
            ? "border-green-500/30 bg-green-500/5 text-green-400"
            : "border-destructive/30 bg-destructive/5 text-destructive",
        ].join(" ")}>
          {!result.ok && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>
            {result.ok
              ? `Done! ${result.total} jobs scored · ${result.withExplanations} with AI explanations`
              : result.error}
          </span>
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
