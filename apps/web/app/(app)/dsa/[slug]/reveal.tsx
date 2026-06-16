"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lightbulb, ListOrdered, Code2, Check, Lock, Loader2, Sparkles,
  CheckCircle2, Copy, Flame,
} from "lucide-react";
import { InlinePaywall } from "../_components/inline-paywall";
import { NextRefreshCountdown } from "../_components/countdown";
import { revealApproachAction, revealSolutionLangsAction, markSolvedAction } from "../actions";

// Progressive reveal with per-feature tier gating.
//  - Approach + walkthrough: Free sees a teaser; unlocks the rest with one of
//    3 monthly credits, or upgrades. Pro/Sprint get it in full.
//  - Solution: Python is free for all; Java/C++ are Pro+. Sprint adds an
//    annotations toggle.
//  - AI Coach reflection is tiered.
// Gated strings (full approach/steps, Java/C++) are fetched from server actions
// on demand and are never embedded in the initial page for un-entitled users.

type Lang = "python" | "java" | "cpp";
const LANG_LABEL: Record<Lang, string> = { python: "Python", java: "Java", cpp: "C++" };

export interface RevealProps {
  slug: string;
  signedIn: boolean;
  tier: "free" | "pro" | "career_sprint";
  todayStatus: "not_started" | "in_progress" | "solved";
  // approach
  approachTeaser: string[];
  fullApproach: string[] | null;      // present only when entitled
  fullSteps: string[] | null;         // present only when entitled
  fullApproachesRemaining: number | "unlimited";
  // solution
  codePython: string;
  langsEntitled: boolean;             // Java/C++ delivered
  annotations: boolean;               // Sprint line-by-line
  complexity: { time: string; space: string };
  pitfalls: string[];
  edgeCases: string[];
  whyItMatters: string;
  aiCoach: "none" | "weekly" | "daily";
  patternLabel: string;               // human pattern name, for honest coach copy
}

export function ProgressiveReveal(props: RevealProps) {
  const {
    slug, signedIn, approachTeaser, fullApproach, fullSteps,
    fullApproachesRemaining, codePython, langsEntitled, complexity,
    pitfalls, edgeCases, whyItMatters, aiCoach, patternLabel,
  } = props;

  const router = useRouter();

  // monotonic flow: read problem → open approach → open solution
  const [opened, setOpened] = useState<"none" | "approach" | "solution">("none");

  // approach unlock state (free)
  const entitledApproach = fullApproach !== null;
  const [localApproach, setLocalApproach] = useState<{ approach: string[]; steps: string[] } | null>(null);
  // Track the post-spend remaining count locally so the paywall copy
  // updates inline without waiting for a navigation. The server action
  // already revalidates the route — this is just for the live sub-text.
  const [localRemaining, setLocalRemaining] = useState<number | "unlimited" | null>(null);
  const [spending, startSpend] = useTransition();
  const [exhausted, setExhausted] = useState(false);

  const unlocked = entitledApproach || localApproach !== null;
  const approachContent = entitledApproach
    ? { approach: fullApproach!, steps: fullSteps ?? [] }
    : localApproach;
  const displayedRemaining = localRemaining ?? fullApproachesRemaining;

  function spendUnlock() {
    startSpend(async () => {
      const res = await revealApproachAction(slug);
      if (res.ok) {
        setLocalApproach({ approach: res.approach, steps: res.solutionSteps });
        setLocalRemaining(res.remaining);
        // The hub statcard and any other surface that reads
        // fullApproachesRemaining server-side needs to see the spend.
        router.refresh();
      } else if (res.reason === "exhausted") {
        setExhausted(true);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Approach & walkthrough ─────────────────────────────────────────── */}
      {opened === "none" ? (
        <RevealButton
          icon={<Lightbulb className="h-4 w-4" />}
          label="Stuck? Reveal the approach"
          sub="A narrative walkthrough — read the problem first."
          onClick={() => setOpened("approach")}
        />
      ) : (
        <Panel icon={<Lightbulb className="h-4 w-4" />} title="Approach & walkthrough">
          {/* teaser bullets — always shown */}
          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {approachTeaser.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{a}</span>
              </li>
            ))}
          </ul>

          {unlocked && approachContent ? (
            <div className="animate-fade-up mt-3 space-y-4">
              {approachContent.approach.length > approachTeaser.length && (
                <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {approachContent.approach.slice(approachTeaser.length).map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              {approachContent.steps.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListOrdered className="h-3.5 w-3.5" /> Step by step
                  </p>
                  <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {approachContent.steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {/* blurred teaser of what's behind the gate */}
              <div className="relative" aria-hidden>
                <ul className="select-none space-y-2 text-sm leading-relaxed text-muted-foreground blur-[5px] [mask-image:linear-gradient(to_bottom,black,transparent)]">
                  <li>The full reasoning continues here with the key insight…</li>
                  <li>…then the exact step-by-step walkthrough to the solution.</li>
                </ul>
              </div>
              {signedIn && !exhausted && displayedRemaining !== 0 ? (
                <InlinePaywall
                  trigger="dsa_full_approach"
                  variant="spend"
                  headline="Want the full step-by-step explanation?"
                  sub={
                    displayedRemaining === "unlimited"
                      ? "Unlock the complete approach and walkthrough."
                      : `${displayedRemaining} of 3 free unlocks left this month.`
                  }
                  spendLabel={spending ? "Unlocking…" : "Unlock now (free)"}
                  spending={spending}
                  onSpend={spendUnlock}
                  ctaLabel="Get unlimited with Pro"
                />
              ) : (
                <InlinePaywall
                  trigger="dsa_full_approach"
                  headline="Want the full step-by-step explanation?"
                  sub="Pro is only ₹3.30/day — full approaches every day."
                  ctaLabel="Unlock with Pro"
                />
              )}
            </div>
          )}
        </Panel>
      )}

      {/* ── Solution ───────────────────────────────────────────────────────── */}
      {opened === "approach" && (
        <RevealButton
          icon={<Code2 className="h-4 w-4" />}
          label="Reveal the solution"
          sub={langsEntitled ? "Python, Java and C++ with complexity." : "Python solution with complexity."}
          onClick={() => setOpened("solution")}
        />
      )}

      {opened === "solution" && (
        <>
          <SolutionPanel slug={slug} python={codePython} langsEntitled={langsEntitled} annotations={props.annotations} complexity={complexity} />

          <Panel title="Common pitfalls">
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {pitfalls.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/60" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Edge cases">
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {edgeCases.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Why it matters">
            <p className="text-sm leading-relaxed text-muted-foreground">{whyItMatters}</p>
          </Panel>

          <AiCoachPanel aiCoach={aiCoach} patternLabel={patternLabel} />
        </>
      )}

      {/* Completion CTA — always reachable, even if the user reads the
          problem and pitfalls without revealing the approach/solution.
          The daily commitment is "I read today's question", not "I revealed
          the answer". Anchoring this outside the reveal branches is the
          single biggest streak-retention fix. */}
      <CompletionFooter slug={slug} signedIn={signedIn} todayStatus={props.todayStatus} />
    </div>
  );
}

function SolutionPanel({
  slug, python, langsEntitled, annotations, complexity,
}: {
  slug: string;
  python: string;
  langsEntitled: boolean;
  annotations: boolean;
  complexity: { time: string; space: string };
}) {
  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState<Record<Lang, string | null>>({ python, java: null, cpp: null });
  const [loadingLangs, startLoad] = useTransition();
  const [showPaywall, setShowPaywall] = useState(false);
  const [annotate, setAnnotate] = useState(false);
  const [copied, setCopied] = useState(false);

  function selectLang(l: Lang) {
    if (l === "python") { setLang("python"); return; }
    if (!langsEntitled) { setShowPaywall(true); return; }
    setLang(l);
    if (code[l] === null) {
      startLoad(async () => {
        const res = await revealSolutionLangsAction(slug);
        if (res.ok) setCode((c) => ({ ...c, java: res.java, cpp: res.cpp }));
      });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code[lang] ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — ignore */ }
  }

  const current = code[lang];

  return (
    <Panel icon={<Code2 className="h-4 w-4" />} title="Solution">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LANG_LABEL) as Lang[]).map((l) => {
            const locked = l !== "python" && !langsEntitled;
            const active = lang === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => selectLang(l)}
                aria-label={locked ? `Locked — upgrade to Pro to view ${LANG_LABEL[l]}` : LANG_LABEL[l]}
                className={`press tap-target-sm inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  active && !locked
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                } ${locked ? "opacity-70" : ""}`}
              >
                {locked && <Lock className="h-3 w-3" />}
                {LANG_LABEL[l]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {annotations && (
            <button
              type="button"
              onClick={() => setAnnotate((a) => !a)}
              className={`press tap-target-sm rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                annotate ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              Annotate
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="press tap-target-sm inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/70"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {loadingLangs && current === null ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed">
          <code>{current ?? python}</code>
        </pre>
      )}

      {annotate && annotations && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Read the inline <span className="text-foreground"># comments</span> in the code above — they walk through the
          key decision on each step.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Meta label="Time complexity" value={complexity.time} />
        <Meta label="Space complexity" value={complexity.space} />
      </div>

      {showPaywall && (
        <div className="mt-3">
          <InlinePaywall
            trigger="dsa_other_langs"
            headline="See it in Java and C++ instantly"
            sub="Pro unlocks every solution in all three languages."
            ctaLabel="Unlock all languages"
          />
        </div>
      )}
    </Panel>
  );
}

function AiCoachPanel({ aiCoach, patternLabel }: { aiCoach: "none" | "weekly" | "daily"; patternLabel: string }) {
  if (aiCoach === "daily") {
    return (
      <section className="surface-inset p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-sm font-semibold tracking-tight">AI Coach</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Today drills the <span className="font-medium text-foreground">{patternLabel}</span> pattern — one of the
          recurring shapes in product-company interviews. Notice the trade-off the solution makes, not just the answer:
          that&apos;s what transfers to the next problem. Log today&apos;s rep and keep the streak alive.
        </p>
      </section>
    );
  }
  if (aiCoach === "weekly") {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-sm font-semibold tracking-tight">AI Coach</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Saved to your <span className="font-medium text-foreground">weekly digest</span> — arrives Sunday with
          patterns across everything you solved this week.
        </p>
      </section>
    );
  }
  return (
    <div className="mt-1">
      <InlinePaywall
        trigger="dsa_ai_coach"
        headline="AI Coach reflects on how you solve"
        sub="Daily personalized feedback on Career Sprint; weekly digest on Pro."
        ctaLabel="Unlock AI Coach"
      />
    </div>
  );
}

function CompletionFooter({
  slug, signedIn, todayStatus,
}: {
  slug: string;
  signedIn: boolean;
  todayStatus: "not_started" | "in_progress" | "solved";
}) {
  const router = useRouter();
  const [done, setDone] = useState(todayStatus === "solved");
  const [streak, setStreak] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login?next=/dsa" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to track your streak and get a fresh question every day.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" />
          {streak !== null ? (
            <>Day complete — {streak}-day streak <Flame className="h-3.5 w-3.5 text-warning" /></>
          ) : (
            <>Completed today</>
          )}
        </p>
        <NextRefreshCountdown className="mt-1.5" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dsa"
            className="press rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:bg-secondary focus-ring"
          >
            Back to DSA Lab
          </Link>
        </div>
      </div>
    );
  }

  function complete() {
    start(async () => {
      const res = await markSolvedAction(slug);
      if (res.ok) {
        setDone(true);
        setStreak(res.current);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={complete}
      disabled={pending}
      className="press tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-60 focus-ring"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
      Mark as read &amp; keep my streak
    </button>
  );
}

function RevealButton({
  icon, label, sub, onClick,
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
      className="press flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-4 text-left transition hover:border-primary/50 hover:bg-card focus-ring"
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
  icon, title, children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up rounded-xl border border-border bg-card p-4 sm:p-5">
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
