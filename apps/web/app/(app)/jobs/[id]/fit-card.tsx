"use client";

// Fit Card — Sprint 6 redesign.
//
// Was a single 1500px vertical scroll on mobile. Now a tabbed surface with
// a persistent verdict header. Five tabs:
//   • Snapshot     — hard blockers, soft gaps, level read (default)
//   • Resume tweaks — 3 ranked, copy-pasteable bullets
//   • Stories      — STAR prompts mapped to JD must-haves
//   • Comp         — compensation reality + market_comp grounding
//   • Evidence     — Sprint 6 score evidence: confidence, hard caps,
//                    tech coverage. Replaces the standalone ScoreEvidence
//                    panel previously rendered below the Fit Card.
//
// Deep-link via ?card_tab=stories etc. Persists across reloads, makes the
// state survive a "back" navigation from a job-detail apply flow.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Compass, Target, AlertCircle, Lightbulb, Layers, IndianRupee,
  MessagesSquare, Copy, Check, ShieldCheck, ShieldAlert, Activity,
  ChevronRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getScoreBand, getConfidenceLabel } from "@/lib/matching/bands";

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

// Sprint 6 — embedded Score Evidence data (was a sibling component).
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

const BAND_META: Record<"under" | "at" | "over", { label: string; tone: string; bg: string; border: string }> = {
  under: { label: "Below your level", tone: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  at:    { label: "At your level",    tone: "text-success", bg: "bg-success/10", border: "border-success/30" },
  over:  { label: "Above your level", tone: "text-primary", bg: "bg-primary-soft", border: "border-primary/30" },
};

type TabKey = "snapshot" | "tweaks" | "stories" | "comp" | "evidence";

const TABS: Array<{ key: TabKey; label: string; short: string; icon: React.ReactNode }> = [
  { key: "snapshot", label: "Snapshot",      short: "Snapshot",   icon: <Layers className="h-3.5 w-3.5" /> },
  { key: "tweaks",   label: "Resume tweaks", short: "Tweaks",     icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { key: "stories",  label: "Stories",       short: "Stories",    icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  { key: "comp",     label: "Comp",          short: "Comp",       icon: <IndianRupee className="h-3.5 w-3.5" /> },
  { key: "evidence", label: "Evidence",      short: "Evidence",   icon: <Activity className="h-3.5 w-3.5" /> },
];

const HARD_CAP_NOTES: Record<string, string> = {
  thin_jd:       "JD too short to score reliably (capped at 70).",
  no_stack:      "None of the JD's must-have skills are on your resume (capped at 50).",
  adjacent_only: "Must-haves matched only by adjacent skills, not direct hits (capped at 70).",
  senior_no_exp: "JD targets senior+; <2 yrs professional experience (capped at 45).",
};

interface TechCoverageShape {
  direct?: string[];
  adjacent?: Array<{ jdSkill: string; via: string }>;
  missing?: string[];
}

function isValidTab(k: string | null): k is TabKey {
  return k === "snapshot" || k === "tweaks" || k === "stories" || k === "comp" || k === "evidence";
}

export function FitCardPanel({
  data,
  score,
  evidence,
}: {
  data: FitCardData;
  score: number;
  evidence?: FitCardEvidence;
}) {
  const reduce = useReducedMotion();
  const v = VERDICT[data.verdict];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initialTab = isValidTab(params.get("card_tab")) ? (params.get("card_tab") as TabKey) : "snapshot";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep tab in sync with URL when user navigates (back/forward).
  useEffect(() => {
    const fromUrl = params.get("card_tab");
    if (isValidTab(fromUrl) && fromUrl !== tab) setTab(fromUrl);
    // Intentionally only re-run on params change; we own the local→URL push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    // Update URL without triggering a server round-trip — preserve other params.
    const sp = new URLSearchParams(params.toString());
    if (next === "snapshot") sp.delete("card_tab");
    else                     sp.set("card_tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const band = getScoreBand(score);
  const confLabel = evidence?.confidence != null ? getConfidenceLabel(evidence.confidence) : null;
  const confTone =
    confLabel === "high" ? "text-success"
    : confLabel === "low" ? "text-warning"
    : "text-muted-foreground";

  const capNote = evidence?.hardCapReason ? HARD_CAP_NOTES[evidence.hardCapReason] : null;
  const tc = asTechCoverage(evidence?.techCoverage);

  return (
    <motion.section
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border ${v.border} ${v.bg}`}
      aria-label="Fit Card"
    >
      {/* Persistent header */}
      <header className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {band.label}
            </span>
            <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
            {evidence?.confidence != null && (
              <span className={`text-[10px] tabular-nums ${confTone}`}>
                confidence {Math.round(evidence.confidence)}
              </span>
            )}
          </div>
        </div>

        {/* Cap banner — most-critical evidence surfaced above tabs */}
        {capNote && (
          <button
            type="button"
            onClick={() => changeTab("evidence")}
            className="mt-3 flex w-full items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-left text-xs text-warning transition hover:bg-warning/10 focus-ring"
          >
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 leading-relaxed">{capNote}</span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider">See evidence →</span>
          </button>
        )}
      </header>

      {/* Tab bar — horizontal scroll on narrow mobile */}
      <div className="mt-4 px-5 sm:px-6">
        <div
          role="tablist"
          aria-label="Fit Card sections"
          className="-mx-2 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                <span className="sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6" id={`tabpanel-${tab}`} role="tabpanel">
        {tab === "snapshot" && <SnapshotTab data={data} />}
        {tab === "tweaks"   && <TweaksTab data={data} />}
        {tab === "stories"  && <StoriesTab data={data} />}
        {tab === "comp"     && <CompTab data={data} />}
        {tab === "evidence" && <EvidenceTab evidence={evidence ?? null} tc={tc} band={band.label} score={score} />}
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

function SnapshotTab({ data }: { data: FitCardData }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      <Block icon={<Layers className="h-3.5 w-3.5 text-primary" />} label="Level read">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${BAND_META[data.level_read.band].tone} ${BAND_META[data.level_read.band].bg} ${BAND_META[data.level_read.band].border}`}>
          {BAND_META[data.level_read.band].label}
        </span>
        <p className="mt-2 text-sm text-muted-foreground">{data.level_read.note}</p>
      </Block>

      {/* Hint to comp tab when comp_reality is set */}
      {data.comp_reality.negotiate_to_lpa != null && (
        <Block icon={<IndianRupee className="h-3.5 w-3.5 text-primary" />} label="Comp signal">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            <Target className="h-3 w-3" />
            Negotiate toward ₹{data.comp_reality.negotiate_to_lpa} LPA
          </div>
          <p className="mt-2 text-xs text-muted-foreground">See the Comp tab for market grounding.</p>
        </Block>
      )}
    </div>
  );
}

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

function CompTab({ data }: { data: FitCardData }) {
  return (
    <div className="space-y-4">
      <Block icon={<IndianRupee className="h-3.5 w-3.5 text-primary" />} label="Compensation reality">
        <p className="text-sm text-muted-foreground">{data.comp_reality.note}</p>
        {data.comp_reality.negotiate_to_lpa != null && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            <Target className="h-3 w-3" />
            Negotiate toward ₹{data.comp_reality.negotiate_to_lpa} LPA
          </div>
        )}
      </Block>
      {data.market_comp ? (
        <Block icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />} label="Market grounding">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Based on <strong className="text-foreground">n={data.market_comp.n}</strong>{" "}
            {data.market_comp.basis === "exact"
              ? <>postings of <strong className="text-foreground">{data.market_comp.seniority}{data.market_comp.role_function ? ` · ${data.market_comp.role_function}` : ""}</strong></>
              : <>postings at <strong className="text-foreground">{data.market_comp.seniority}</strong> level (cross-function)</>}
            .
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <BracketCell label="median" value={data.market_comp.median} />
            <BracketCell label="p75"    value={data.market_comp.p75} />
            <BracketCell label="p90"    value={data.market_comp.p90} />
          </div>
        </Block>
      ) : (
        <p className="text-xs text-muted-foreground/80">Market context unavailable — JD didn&apos;t disclose a band and the catalog lacks enough peer postings for this seniority × function bucket.</p>
      )}
    </div>
  );
}

function EvidenceTab({
  evidence, tc, band, score,
}: {
  evidence: FitCardEvidence | null;
  tc: TechCoverageShape | null;
  band: string;
  score: number;
}) {
  const capNote = evidence?.hardCapReason ? HARD_CAP_NOTES[evidence.hardCapReason] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score band</p>
          <p className="mt-1 text-sm font-semibold">{band}</p>
          <p className="text-[11px] text-muted-foreground">Score {Math.round(score)} of 100</p>
        </div>
        {evidence?.confidence != null && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</p>
            <p className={`mt-1 text-sm font-semibold tabular-nums ${
              evidence.confidence >= 80 ? "text-success" : evidence.confidence >= 55 ? "text-muted-foreground" : "text-warning"
            }`}>{Math.round(evidence.confidence)}/100</p>
            <p className="text-[10px] text-muted-foreground">Derived from JD + resume completeness</p>
          </div>
        )}
      </div>

      {capNote && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">{capNote}</span>
        </div>
      )}

      {tc && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Tech coverage vs JD must-haves
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CoverageBucket
              tone="success"
              label="Direct"
              count={tc.direct?.length ?? 0}
              items={tc.direct ?? []}
            />
            <CoverageBucket
              tone="warning"
              label="Adjacent"
              count={tc.adjacent?.length ?? 0}
              items={(tc.adjacent ?? []).map((a) => `${a.jdSkill} (via ${a.via})`)}
            />
            <CoverageBucket
              tone="destructive"
              label="Missing"
              count={tc.missing?.length ?? 0}
              items={tc.missing ?? []}
            />
          </div>
        </div>
      )}

      {evidence?.feedbackAdjustment != null && Math.abs(evidence.feedbackAdjustment) >= 0.5 && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">
            <strong className="text-foreground">{evidence.feedbackAdjustment > 0 ? "+" : ""}{evidence.feedbackAdjustment.toFixed(1)}</strong>{" "}from your activity (saves, applies, dismisses).
          </span>
        </div>
      )}

      {!evidence?.confidence && !capNote && !tc && (
        <EmptyTab body="No structured evidence captured for this match yet. Recompute matches to populate." />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────

function Block({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function BracketCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">₹{value}<span className="ml-1 text-[10px] font-normal text-muted-foreground">LPA</span></p>
    </div>
  );
}

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

function CoverageBucket({
  tone, label, count, items,
}: {
  tone: "success" | "warning" | "destructive";
  label: string;
  count: number;
  items: string[];
}) {
  const tones = {
    success:     { border: "border-success/30",     bg: "bg-success/5",     text: "text-success",     count: "text-success" },
    warning:     { border: "border-warning/30",     bg: "bg-warning/5",     text: "text-warning",     count: "text-warning" },
    destructive: { border: "border-destructive/30", bg: "bg-destructive/5", text: "text-destructive", count: "text-destructive" },
  }[tone];
  return (
    <div className={`rounded-md border ${tones.border} ${tones.bg} px-3 py-2`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${tones.text}`}>{label}</span>
        <span className={`text-sm font-bold tabular-nums ${tones.count}`}>{count}</span>
      </div>
      {items.length > 0 && (
        <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
          {items.slice(0, 6).join(", ")}
          {items.length > 6 && ` +${items.length - 6} more`}
        </p>
      )}
    </div>
  );
}

function asTechCoverage(value: unknown): TechCoverageShape | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const hasAny =
    Array.isArray(v.direct) ||
    Array.isArray(v.adjacent) ||
    Array.isArray(v.missing);
  if (!hasAny) return null;
  return {
    direct:   Array.isArray(v.direct)   ? (v.direct as string[]).filter((x) => typeof x === "string") : [],
    adjacent: Array.isArray(v.adjacent) ? (v.adjacent as Array<{ jdSkill: string; via: string }>).filter((a) => a && typeof a === "object" && typeof a.jdSkill === "string" && typeof a.via === "string") : [],
    missing:  Array.isArray(v.missing)  ? (v.missing as string[]).filter((x) => typeof x === "string") : [],
  };
}
