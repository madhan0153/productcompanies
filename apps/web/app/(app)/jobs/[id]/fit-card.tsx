"use client";

// Fit Card — mobile-first compact redesign.
//
// The hero card above already shows score + verdict + cap chip, so this
// panel no longer duplicates that. It opens directly into actionable
// content: ranked resume tweaks (default) and STAR story prompts.
//
// Removed tabs: Snapshot, Comp, Evidence — feedback was that they
// repeated information present elsewhere (snapshot/comp/evidence facts
// are either in the hero or surfaced as inline chips/banners).

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Compass, Lightbulb,
  MessagesSquare, Copy, Check, ShieldCheck, ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

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

// Sprint 6 — Score Evidence data kept as optional prop for back-compat with
// the page caller. Only the cap reason is surfaced (as a banner) — confidence,
// tech coverage, feedback delta are now hidden inside the standalone
// ScoreEvidence component which self-suppresses when nothing useful.
export interface FitCardEvidence {
  confidence: number | null;
  hardCapReason: string | null;
  techCoverage: unknown;
  feedbackAdjustment: number | null;
}

const VERDICT: Record<Verdict, { label: string; tone: string; bg: string; border: string; subtitle: string }> = {
  strong_fit:     { label: "Strong fit",     tone: "text-success",     bg: "bg-success/5",     border: "border-success/30",     subtitle: "You hit the must-haves. Tailor and apply." },
  stretch:        { label: "Stretch",        tone: "text-warning",     bg: "bg-warning/5",     border: "border-warning/30",     subtitle: "You can win this with a focused application." },
  off_target:     { label: "Off-target",     tone: "text-primary",     bg: "bg-primary-soft",  border: "border-primary/30",     subtitle: "Adjacent to your stated targets." },
  underqualified: { label: "Underqualified", tone: "text-primary",     bg: "bg-primary-soft",  border: "border-primary/30",     subtitle: "JD asks for more than your resume shows today." },
  mismatch:       { label: "Mismatch",       tone: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/30", subtitle: "Wrong function. Save your energy." },
};

type TabKey = "tweaks" | "stories";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "tweaks",  label: "Resume tweaks", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { key: "stories", label: "Stories",       icon: <MessagesSquare className="h-3.5 w-3.5" /> },
];

const HARD_CAP_NOTES: Record<string, string> = {
  thin_jd:       "JD too short to score reliably (capped at 70).",
  no_stack:      "None of the JD's must-have skills are on your resume (capped at 50).",
  adjacent_only: "Must-haves matched only by adjacent skills, not direct hits (capped at 70).",
  senior_no_exp: "JD targets senior+; <2 yrs professional experience (capped at 45).",
};

function isValidTab(k: string | null): k is TabKey {
  return k === "tweaks" || k === "stories";
}

export function FitCardPanel({
  data,
  evidence,
}: {
  data: FitCardData;
  /** Score is kept in the prop signature for compatibility with the page caller;
   *  not displayed — the hero card already shows it. */
  score?: number;
  evidence?: FitCardEvidence;
}) {
  const reduce = useReducedMotion();
  const v = VERDICT[data.verdict];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initialTab = isValidTab(params.get("card_tab")) ? (params.get("card_tab") as TabKey) : "tweaks";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep tab in sync with URL when user navigates (back/forward).
  useEffect(() => {
    const fromUrl = params.get("card_tab");
    if (isValidTab(fromUrl) && fromUrl !== tab) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    const sp = new URLSearchParams(params.toString());
    if (next === "tweaks") sp.delete("card_tab");
    else                   sp.set("card_tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const capNote = evidence?.hardCapReason ? HARD_CAP_NOTES[evidence.hardCapReason] : null;

  return (
    <motion.section
      id="fit-card"
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border ${v.border} ${v.bg} scroll-mt-4`}
      aria-label="Fit Card"
    >
      {/* Compact header — verdict + one-liner only. Score lives in the
          hero card above; no need to repeat it here. */}
      <header className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Compass className="h-3 w-3" /> Fit Card
          </p>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${v.tone} ${v.border} ${v.bg}`}>
            {v.label}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {data.one_liner || v.subtitle}
        </p>

        {/* Cap banner — most-critical evidence surfaced above tabs.
            Kept here because the hero's tiny chip can't fit the full reason. */}
        {capNote && (
          <div className="mt-3 flex w-full items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 leading-relaxed">{capNote}</span>
          </div>
        )}
      </header>

      {/* Tab bar — 2 tabs, no scroll needed */}
      <div className="mt-4 px-5 sm:px-6">
        <div
          role="tablist"
          aria-label="Fit Card sections"
          className="-mx-2 flex gap-1 pb-2"
        >
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${t.key}`}
                onClick={() => changeTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition tap-target-sm focus-ring ${
                  isActive
                    ? "border-foreground/30 bg-card text-foreground shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6" id={`tabpanel-${tab}`} role="tabpanel">
        {tab === "tweaks"  && <TweaksTab data={data} />}
        {tab === "stories" && <StoriesTab data={data} />}
      </div>

      <footer className="flex items-center gap-2 border-t border-border/60 bg-background/40 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
        <ShieldCheck className="h-3 w-3" />
        Generated from JD-parsed must-haves and your parsed resume. Re-run any time from the Matches page.
      </footer>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bodies
// ─────────────────────────────────────────────────────────────────────────────

function TweaksTab({ data }: { data: FitCardData }) {
  if (data.resume_tweaks.length === 0) {
    return <EmptyTab body="No resume tweaks generated — the JD didn't surface concrete must-haves to anchor edits to." />;
  }
  return (
    <div>
      <header className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Tap a bullet to copy</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">Ranked by impact</span>
      </header>
      <ol className="space-y-2.5">
        {data.resume_tweaks.map((t, i) => (
          <ResumeTweakRow key={i} tweak={t} />
        ))}
      </ol>
    </div>
  );
}

function StoriesTab({ data }: { data: FitCardData }) {
  if (data.story_prompts.length === 0) {
    return <EmptyTab body="No story prompts produced." />;
  }
  return (
    <div>
      <header className="mb-3 flex items-center gap-2">
        <MessagesSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Stories to bring to the interview</h3>
      </header>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────

function EmptyTab({ body }: { body: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
  );
}

function ResumeTweakRow({ tweak }: { tweak: { priority: 1 | 2 | 3; suggestion: string; why: string } }) {
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
        aria-label={`Copy resume tweak ${tweak.priority}: ${tweak.suggestion}`}
      >
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-soft-foreground">
          {tweak.priority}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-foreground">{tweak.suggestion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tweak.why}</p>
        </div>
        <span className="shrink-0 text-muted-foreground transition group-hover:text-primary">
          {copied
            ? <Check className="h-4 w-4 text-success" />
            : <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider"><Copy className="h-3.5 w-3.5" /><ChevronRight className="h-3 w-3" /></span>}
        </span>
      </button>
    </li>
  );
}
