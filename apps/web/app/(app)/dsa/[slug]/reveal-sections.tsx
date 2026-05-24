"use client";

import { useState } from "react";
import { CheckCircle2, Eye, Target } from "lucide-react";
import type { DsaLearningGuide } from "@prodmatch/shared";
import { CodeTabs } from "../code-tabs";

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
            {(guide.codeByLang || guide.code) && <CodeTabs guide={guide} />}
            <p className="mt-3 text-sm font-medium text-muted-foreground">{guide.complexity}</p>
            {(guide.edgeCases.length > 0 || guide.optimizations.length > 0) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {guide.edgeCases.length > 0 && (
                  <MiniList title="Edge cases" items={guide.edgeCases} />
                )}
                {guide.optimizations.length > 0 && (
                  <MiniList title="Optimizations" items={guide.optimizations} />
                )}
              </div>
            )}
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

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
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
