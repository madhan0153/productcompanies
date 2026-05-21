"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  DSA_CONFIDENCE_HINT,
  DSA_CONFIDENCE_LABEL,
  type DsaConfidence,
} from "@prodmatch/shared";
import { rateDsaConfidenceAction } from "./actions";
import { cn } from "@/lib/utils";

interface Props {
  problemSlug: string;
  /** Initial confidence if already rated. */
  initialConfidence?: DsaConfidence | null;
  /** Initial next-review date if already rated (YYYY-MM-DD). */
  initialNextReview?: string | null;
}

const OPTIONS: Array<{
  value: DsaConfidence;
  icon: React.ReactNode;
  tone: string;
}> = [
  { value: "got_it",   icon: <ThumbsUp className="h-3.5 w-3.5" />,  tone: "text-success" },
  { value: "review",   icon: <Sparkles className="h-3.5 w-3.5" />,  tone: "text-warning" },
  { value: "confused", icon: <ThumbsDown className="h-3.5 w-3.5" />, tone: "text-destructive" },
];

export function ConfidenceRating({ problemSlug, initialConfidence, initialNextReview }: Props) {
  const [confidence, setConfidence] = useState<DsaConfidence | null>(initialConfidence ?? null);
  const [nextReview, setNextReview] = useState<string | null>(initialNextReview ?? null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePick(next: DsaConfidence) {
    setFlash(null);
    startTransition(async () => {
      try {
        const res = await rateDsaConfidenceAction({ problem_slug: problemSlug, confidence: next });
        if (res.ok) {
          setConfidence(res.data.confidence);
          setNextReview(res.data.next_review_at);
          setFlash({ kind: "ok", text: DSA_CONFIDENCE_HINT[res.data.confidence] });
        } else {
          setFlash({ kind: "err", text: res.error });
        }
      } catch {
        setFlash({ kind: "err", text: "Could not save your rating. Please try again." });
      }
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">How well did you understand?</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your rating tunes when this problem shows up again.
          </p>
        </div>
        {nextReview && (
          <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
            Next: {formatReviewDate(nextReview)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = option.value === confidence;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePick(option.value)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
                pending && "cursor-wait opacity-80",
              )}
            >
              {pending && active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              ) : active ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className={option.tone}>{option.icon}</span>
              )}
              {DSA_CONFIDENCE_LABEL[option.value]}
            </button>
          );
        })}
      </div>

      {flash && (
        <p
          className={cn(
            "mt-3 text-xs",
            flash.kind === "ok" ? "text-success" : "text-destructive",
          )}
        >
          {flash.text}
        </p>
      )}
    </section>
  );
}

function formatReviewDate(iso: string): string {
  // Display as e.g. "May 24"
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
