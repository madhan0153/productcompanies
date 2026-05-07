"use client";

import { useState } from "react";
import {
  Compass, Target, AlertCircle, Lightbulb, Layers, IndianRupee,
  MessagesSquare, Copy, Check, ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

// Phase G — Fit Card UI.
// Reads the structured JSON saved on matches.fit_card. Verdict-first; the
// 0-100 score is shown but de-emphasised. Resume tweaks are copy-pasteable
// because that's the actual thing that improves the next application.

type Verdict = "strong_fit" | "stretch" | "underqualified" | "mismatch" | "off_target";

export interface FitCardData {
  verdict: Verdict;
  one_liner: string;
  hard_blockers: string[];
  soft_gaps: string[];
  resume_tweaks: Array<{ priority: 1 | 2 | 3; suggestion: string; why: string }>;
  level_read: { band: "under" | "at" | "over"; note: string };
  comp_reality: { note: string; negotiate_to_lpa: number | null };
  story_prompts: Array<{ requirement: string; prompt: string }>;
}

const VERDICT: Record<Verdict, { label: string; tone: string; bg: string; ring: string; subtitle: string }> = {
  strong_fit:     { label: "Strong fit",     tone: "text-emerald-400", bg: "from-emerald-500/15 to-transparent",  ring: "ring-emerald-500/30", subtitle: "You hit the must-haves. Tailor and apply." },
  stretch:        { label: "Stretch",         tone: "text-amber-400",   bg: "from-amber-500/15 to-transparent",     ring: "ring-amber-500/30",   subtitle: "You can win this with a focused application." },
  off_target:     { label: "Off-target",      tone: "text-violet-400",  bg: "from-violet-500/15 to-transparent",    ring: "ring-violet-500/30",  subtitle: "Adjacent to your stated targets." },
  underqualified: { label: "Underqualified",  tone: "text-sky-400",     bg: "from-sky-500/15 to-transparent",       ring: "ring-sky-500/30",     subtitle: "JD asks for more than your resume shows today." },
  mismatch:       { label: "Mismatch",        tone: "text-rose-400",    bg: "from-rose-500/15 to-transparent",      ring: "ring-rose-500/30",    subtitle: "Wrong function. Save your energy." },
};

const BAND: Record<"under" | "at" | "over", { label: string; tone: string }> = {
  under: { label: "Below your level", tone: "text-amber-400" },
  at:    { label: "At your level",    tone: "text-emerald-400" },
  over:  { label: "Above your level", tone: "text-violet-400" },
};

export function FitCardPanel({ data, score }: { data: FitCardData; score: number }) {
  const reduce = useReducedMotion();
  const v = VERDICT[data.verdict];

  return (
    <motion.section
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${v.bg} bg-card/50 p-6 elev-1 backdrop-blur ring-1 ${v.ring}`}
    >
      {/* Decorative halo */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />

      <header className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-card/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Compass className="h-3 w-3" /> Fit Card
          </p>
          <h2 className={`mt-2 font-display text-xl font-semibold tracking-tight ${v.tone}`}>{v.label}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.one_liner || v.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Score</span>
          <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
          <span className="text-[10px] text-muted-foreground/60">verdict, not score</span>
        </div>
      </header>

      <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Hard blockers */}
        {data.hard_blockers.length > 0 && (
          <Block icon={<AlertCircle className="h-3.5 w-3.5 text-rose-400" />} label="Hard blockers" subdued={false}>
            <ul className="space-y-1.5">
              {data.hard_blockers.map((b, i) => (
                <li key={i} className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-sm text-rose-100/90">
                  {b}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Soft gaps */}
        {data.soft_gaps.length > 0 && (
          <Block icon={<AlertCircle className="h-3.5 w-3.5 text-amber-400" />} label="Soft gaps">
            <ul className="space-y-1.5">
              {data.soft_gaps.map((g, i) => (
                <li key={i} className="text-sm text-muted-foreground">· {g}</li>
              ))}
            </ul>
          </Block>
        )}

        {/* Level read */}
        <Block icon={<Layers className="h-3.5 w-3.5 text-primary" />} label="Level read">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border border-current/30 px-2 py-0.5 text-xs font-medium ${BAND[data.level_read.band].tone}`}>
              {BAND[data.level_read.band].label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{data.level_read.note}</p>
        </Block>

        {/* Comp reality */}
        <Block icon={<IndianRupee className="h-3.5 w-3.5 text-primary" />} label="Compensation reality">
          <p className="text-sm text-muted-foreground">{data.comp_reality.note}</p>
          {data.comp_reality.negotiate_to_lpa != null && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 text-xs text-emerald-400">
              <Target className="h-3 w-3" />
              Negotiate toward ₹{data.comp_reality.negotiate_to_lpa} LPA
            </div>
          )}
        </Block>
      </div>

      {/* Resume tweaks — the actionable section */}
      {data.resume_tweaks.length > 0 && (
        <div className="relative mt-6">
          <header className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">Resume tweaks for this application</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">Click to copy</span>
          </header>
          <ol className="space-y-2.5">
            {data.resume_tweaks.map((t, i) => (
              <ResumeTweakRow key={i} tweak={t} />
            ))}
          </ol>
        </div>
      )}

      {/* Story prompts */}
      {data.story_prompts.length > 0 && (
        <div className="relative mt-6">
          <header className="mb-3 flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">Stories to bring to the interview</h3>
          </header>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {data.story_prompts.map((s, i) => (
              <li key={i} className="rounded-xl border border-border bg-card/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  {s.requirement}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.prompt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="relative mt-6 flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        Generated from JD-parsed must-haves and your parsed resume. Re-run any time from the Matches page.
      </footer>
    </motion.section>
  );
}

function Block({
  icon, label, children, subdued = true,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  subdued?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border ${subdued ? "bg-card/40" : "bg-card/60"} p-4`}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function ResumeTweakRow({
  tweak,
}: {
  tweak: { priority: 1 | 2 | 3; suggestion: string; why: string };
}) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(tweak.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unsupported — silent */ }
  };

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="press group flex w-full items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition hover:border-primary/40 focus-ring"
      >
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          {tweak.priority}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-foreground">{tweak.suggestion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tweak.why}</p>
        </div>
        <span className="shrink-0 text-muted-foreground transition group-hover:text-primary">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </span>
      </button>
    </li>
  );
}
