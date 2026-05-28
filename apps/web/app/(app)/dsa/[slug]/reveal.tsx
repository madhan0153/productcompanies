"use client";

import { useState } from "react";
import { Lightbulb, ListOrdered, Code2, Check } from "lucide-react";

// Progressive reveal — the learner unlocks the approach, then the step-by-step
// walkthrough, then full multi-language solutions. Each stage stays hidden
// until requested so the problem can be attempted first. No motion library is
// used; the only animation is a CSS height/opacity that honours reduce-motion.

type Question = {
  approach: string[];
  solutionSteps: string[];
  code: { python: string; java: string; cpp: string };
  complexity: { time: string; space: string };
  pitfalls: string[];
  edgeCases: string[];
  whyItMatters: string;
};

type Lang = "python" | "java" | "cpp";
const LANG_LABEL: Record<Lang, string> = { python: "Python", java: "Java", cpp: "C++" };

export function ProgressiveReveal({ q }: { q: Question }) {
  const [stage, setStage] = useState(0); // 0=none, 1=approach, 2=steps, 3=solution
  const [lang, setLang] = useState<Lang>("python");

  return (
    <div className="space-y-4">
      {/* Stage 1 — approach */}
      {stage >= 1 ? (
        <Panel icon={<Lightbulb className="h-4 w-4" />} title="Approach">
          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {q.approach.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <RevealButton
          icon={<Lightbulb className="h-4 w-4" />}
          label="Stuck? Reveal the approach"
          sub="A narrative hint — no code yet."
          onClick={() => setStage(1)}
        />
      )}

      {/* Stage 2 — solution steps */}
      {stage >= 1 &&
        (stage >= 2 ? (
          <Panel icon={<ListOrdered className="h-4 w-4" />} title="Solution steps">
            <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {q.solutionSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Panel>
        ) : (
          <RevealButton
            icon={<ListOrdered className="h-4 w-4" />}
            label="Reveal the step-by-step walkthrough"
            sub="The full reasoning, still without final code."
            onClick={() => setStage(2)}
          />
        ))}

      {/* Stage 3 — full solution */}
      {stage >= 2 &&
        (stage >= 3 ? (
          <>
            <Panel icon={<Code2 className="h-4 w-4" />} title="Solution">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition motion-reduce:transition-none ${
                      lang === l
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed">
                <code>{q.code[lang]}</code>
              </pre>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Meta label="Time complexity" value={q.complexity.time} />
                <Meta label="Space complexity" value={q.complexity.space} />
              </div>
            </Panel>

            <Panel title="Common pitfalls">
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {q.pitfalls.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/60" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Edge cases">
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {q.edgeCases.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Why it matters">
              <p className="text-sm leading-relaxed text-muted-foreground">{q.whyItMatters}</p>
            </Panel>
          </>
        ) : (
          <RevealButton
            icon={<Code2 className="h-4 w-4" />}
            label="Reveal the full solution"
            sub="Python / Java / C++, complexity, pitfalls and edge cases."
            onClick={() => setStage(3)}
          />
        ))}
    </div>
  );
}

function RevealButton({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4 text-left transition hover:border-primary/50 hover:bg-card motion-reduce:transition-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}
