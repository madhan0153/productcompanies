"use client";

import { useState } from "react";
import { CheckCircle2, Eye, Target } from "lucide-react";
import type { DsaLearningGuide } from "@prodmatch/shared";

/**
 * Progressive disclosure for problem detail.
 *
 * Why client-side: keeping the Approach and Solution hidden until the learner
 * taps "Reveal" is the difference between studying and skimming. Server
 * rendering both at once defeats the learning loop. The Question block stays
 * server-rendered above; only the reveal-gated sections live here.
 */
export function RevealSections({ guide }: { guide: DsaLearningGuide }) {
  const [showApproach, setShowApproach] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold">
          <span className="text-primary">
            <Target className="h-4 w-4" />
          </span>
          Approach
        </h2>
        {showApproach ? (
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <ol className="space-y-2">
              {guide.approach.map((line, index) => (
                <li key={line} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <RevealCta
            label="Reveal approach"
            hint="Try framing your own approach first. The 30 seconds you think before peeking is where learning happens."
            onClick={() => setShowApproach(true)}
          />
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold">
          <span className="text-primary">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          Clean Solution
        </h2>
        {showSolution ? (
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <ol className="space-y-2">
              {guide.solution.map((line, index) => (
                <li key={line} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            {guide.code && (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-secondary/50 p-3 text-[12px] leading-relaxed">
                <code>{guide.code}</code>
              </pre>
            )}
            <p className="mt-3 text-sm font-medium text-muted-foreground">{guide.complexity}</p>
          </div>
        ) : (
          <RevealCta
            label="Reveal solution"
            hint="Lock in your approach in your head before reading the canonical code."
            onClick={() => setShowSolution(true)}
            disabled={!showApproach}
            disabledHint="Reveal the approach first."
          />
        )}
      </section>
    </>
  );
}

function RevealCta({
  label,
  hint,
  onClick,
  disabled,
  disabledHint,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm leading-relaxed text-muted-foreground">{disabled ? disabledHint : hint}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Eye className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}
