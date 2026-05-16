// Sprint 5 — Feature 34b. "What the recruiter sees" panel.
//
// Pure server component — no client state. Renders the AtsView produced by
// computeAtsView() into a two-column layout:
//   - Left: the JD's must/nice-to-have keywords with traffic-light status
//   - Right: the structural checks an ATS would flag
// Top: headline ATS score + summary numbers + the "share screenshot" CTA.

import {
  Eye, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, FileWarning,
} from "lucide-react";
import type { AtsView } from "@/lib/matching/ats-view";

const STATUS = {
  present: { tone: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Match", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  weak:    { tone: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Weak",  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  missing: { tone: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    label: "Miss",  icon: <XCircle className="h-3.5 w-3.5" /> },
} as const;

function scoreTone(score: number) {
  if (score >= 80) return { ring: "stroke-emerald-400", text: "text-emerald-400", label: "Application-ready" };
  if (score >= 60) return { ring: "stroke-amber-400",   text: "text-amber-400",   label: "Workable with edits" };
  return                  { ring: "stroke-rose-400",   text: "text-rose-400",    label: "Likely auto-rejected" };
}

export function RecruiterView({ view }: { view: AtsView }) {
  const tone = scoreTone(view.ats_score);
  const circumference = 2 * Math.PI * 28;
  const dash = (view.ats_score / 100) * circumference;

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Eye className="h-3 w-3" /> What the recruiter sees
          </div>
          <h3 className="mt-2 font-display text-base font-bold">ATS keyword scan</h3>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            What a Workday / Greenhouse / iCIMS keyword-match engine sees when your resume is parsed against this JD.
            Deterministic — same resume × JD always produces the same view.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 64 64" className="absolute inset-0">
              <circle cx="32" cy="32" r="28" fill="none" className="stroke-secondary/60" strokeWidth="6" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                className={tone.ring}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold tabular-nums ${tone.text}`}>{view.ats_score}</span>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${tone.text}`}>{tone.label}</p>
            <p className="text-[11px] text-muted-foreground">ATS keyword score</p>
          </div>
        </div>
      </header>

      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Must-haves matched" value={`${view.summary.must_present} / ${view.summary.must_total}`} pct={view.summary.must_coverage_pct} tone="primary" />
        <SummaryStat label="Nice-to-haves matched" value={`${view.summary.nice_present} / ${view.summary.nice_total}`} pct={view.summary.nice_coverage_pct} tone="violet" />
        <SummaryStat label="Quantified bullets" value={`${view.summary.bullets_with_metrics} / ${view.summary.bullets_total}`} pct={view.summary.bullets_total ? Math.round((view.summary.bullets_with_metrics / view.summary.bullets_total) * 100) : 0} tone="amber" />
        <SummaryStat label="Structural checks" value={`${view.checks.filter((c) => c.passed).length} / ${view.checks.length}`} pct={view.checks.length ? Math.round((view.checks.filter((c) => c.passed).length / view.checks.length) * 100) : 0} tone="emerald" />
      </div>

      {/* Two-column: keywords | structural */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Keywords (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <KeywordBlock title="Must-have keywords (JD)" rows={view.must_haves} emptyHint="JD doesn't name any must-have skills explicitly. ATS keyword-match has nothing to score against." />
          <KeywordBlock title="Nice-to-have keywords (JD)" rows={view.nice_to_haves} emptyHint="No nice-to-haves named in the JD." />
        </div>

        {/* Structural (1/3) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/30">
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
              <FileWarning className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Structural checks</p>
            </div>
            <ul className="divide-y divide-border/40">
              {view.checks.map((c) => (
                <li key={c.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    {c.passed ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                    )}
                    <div>
                      <p className={`text-xs font-medium ${c.passed ? "text-foreground" : "text-rose-300"}`}>{c.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{c.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-5 flex items-center gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-emerald-400" />
        Deterministic keyword + structure analysis. Not powered by an LLM. Re-runs reflect resume edits in real time.
      </footer>
    </section>
  );
}

function SummaryStat({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: "primary" | "violet" | "amber" | "emerald" }) {
  const colors = {
    primary: "from-primary to-primary/80",
    violet:  "from-primary to-primary/80",
    amber:   "from-warning to-warning/80",
    emerald: "from-success to-success/80",
  } as const;
  return (
    <div className="rounded-xl border border-border bg-card/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{value}</p>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
        <div className={`h-full rounded-full bg-gradient-to-r ${colors[tone]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KeywordBlock({ title, rows, emptyHint }: { title: string; rows: AtsView["must_haves"]; emptyHint: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card/30">
      <div className="border-b border-border/50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <ul className="divide-y divide-border/40">
        {rows.map((row, i) => {
          const s = STATUS[row.status];
          return (
            <li key={`${row.keyword}-${i}`} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.keyword}</p>
                {row.evidence && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{row.evidence}</p>
                )}
                {!row.evidence && row.status === "missing" && (
                  <p className="mt-0.5 text-[11px] text-rose-300/80">No mention on resume — likely auto-filtered.</p>
                )}
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.tone} ${s.border} ${s.bg}`}>
                {s.icon}
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
