"use client";

import { useState } from "react";
import {
  Compass, Target, AlertCircle, Lightbulb, Layers, IndianRupee,
  MessagesSquare, Copy, Check, ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

// Fit Card — reads the structured JSON saved on matches.fit_card.
// Verdict-first; the 0-100 score is shown but de-emphasised. Resume tweaks
// are copy-pasteable because that's the actionable artefact.

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
  market_comp?: {
    basis: "exact" | "seniority_only";
    seniority: string;
    role_function: string | null;
    n: number;
    median: number;
    p75: number;
    p90: number;
  } | null;
}

const VERDICT: Record<Verdict, { label: string; tone: string; bg: string; border: string; subtitle: string }> = {
  strong_fit:     { label: "Strong fit",     tone: "text-success",     bg: "bg-success/5",     border: "border-success/30",     subtitle: "You hit the must-haves. Tailor and apply." },
  stretch:        { label: "Stretch",        tone: "text-warning",     bg: "bg-warning/5",     border: "border-warning/30",     subtitle: "You can win this with a focused application." },
  off_target:     { label: "Off-target",     tone: "text-primary",     bg: "bg-primary-soft",  border: "border-primary/30",     subtitle: "Adjacent to your stated targets." },
  underqualified: { label: "Underqualified", tone: "text-primary",     bg: "bg-primary-soft",  border: "border-primary/30",     subtitle: "JD asks for more than your resume shows today." },
  mismatch:       { label: "Mismatch",       tone: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/30", subtitle: "Wrong function. Save your energy." },
};

const BAND: Record<"under" | "at" | "over", { label: string; tone: string; bg: string; border: string }> = {
  under: { label: "Below your level", tone: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  at:    { label: "At your level",    tone: "text-success", bg: "bg-success/10", border: "border-success/30" },
  over:  { label: "Above your level", tone: "text-primary", bg: "bg-primary-soft", border: "border-primary/30" },
};

export function FitCardPanel({ data, score }: { data: FitCardData; score: number }) {
  const reduce = useReducedMotion();
  const v = VERDICT[data.verdict];

  return (
    <motion.section
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border ${v.border} ${v.bg} p-5 sm:p-6`}
    >
      <header className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Compass className="h-3 w-3" /> Fit Card
          </p>
          <h2 className={`mt-2 text-xl font-semibold tracking-tight ${v.tone}`}>{v.label}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {data.one_liner || v.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Score</span>
          <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
          <span className="text-[10px] text-muted-foreground">verdict, not score</span>
        </div>
      </header>

      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hard blockers */}
        {data.hard_blockers.length > 0 && (
          <Block icon={<AlertCircle className="h-3.5 w-3.5 text-destructive" />} label="Hard blockers">
            <ul className="space-y-1.5">
              {data.hard_blockers.map((b, i) => (
                <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm">
                  {b}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Soft gaps */}
        {data.soft_gaps.length > 0 && (
          <Block icon={<AlertCircle className="h-3.5 w-3.5 text-warning" />} label="Soft gaps">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {data.soft_gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                  {g}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Level read */}
        <Block icon={<Layers className="h-3.5 w-3.5 text-primary" />} label="Level read">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${BAND[data.level_read.band].tone} ${BAND[data.level_read.band].bg} ${BAND[data.level_read.band].border}`}>
            {BAND[data.level_read.band].label}
          </span>
          <p className="mt-2 text-sm text-muted-foreground">{data.level_read.note}</p>
        </Block>

        {/* Comp reality */}
        <Block icon={<IndianRupee className="h-3.5 w-3.5 text-primary" />} label="Compensation reality">
          <p className="text-sm text-muted-foreground">{data.comp_reality.note}</p>
          {data.comp_reality.negotiate_to_lpa != null && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              <Target className="h-3 w-3" />
              Negotiate toward ₹{data.comp_reality.negotiate_to_lpa} LPA
            </div>
          )}
          {data.market_comp && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              <ShieldCheck className="mr-1 inline h-3 w-3 text-success" />
              Grounded in <strong className="text-foreground">n={data.market_comp.n}</strong>{" "}
              {data.market_comp.basis === "exact"
                ? <>postings of <strong className="text-foreground">{data.market_comp.seniority}{data.market_comp.role_function ? ` · ${data.market_comp.role_function}` : ""}</strong></>
                : <>postings at <strong className="text-foreground">{data.market_comp.seniority}</strong> level (cross-function)</>}
              {" — median ₹"}{data.market_comp.median}
              {" / p75 ₹"}{data.market_comp.p75}
              {" / p90 ₹"}{data.market_comp.p90}.
            </p>
          )}
        </Block>
      </div>

      {/* Resume tweaks — the actionable section */}
      {data.resume_tweaks.length > 0 && (
        <div className="relative mt-6">
          <header className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Resume tweaks for this application</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">Tap to copy</span>
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
            <h3 className="text-sm font-semibold">Stories to bring to the interview</h3>
          </header>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.story_prompts.map((s, i) => {
              const missing = /no matching project|add one before applying/i.test(s.prompt);
              return (
                <li
                  key={i}
                  className={`rounded-xl border p-3 ${missing ? "border-warning/30 bg-warning/5" : "border-border bg-card"}`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${missing ? "text-warning" : "text-primary"}`}>
                    {missing ? "Gap to close" : s.requirement}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {missing
                      ? <>No bullet on your resume covers <strong className="text-foreground">{s.requirement}</strong>. Add one before applying.</>
                      : s.prompt}
                  </p>
                </li>
              );
            })}
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
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        className="press group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 focus-ring tap-target"
      >
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-soft-foreground">
          {tweak.priority}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-foreground">{tweak.suggestion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tweak.why}</p>
        </div>
        <span className="shrink-0 text-muted-foreground transition group-hover:text-primary">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </span>
      </button>
    </li>
  );
}
