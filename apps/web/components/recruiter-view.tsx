// "What the recruiter sees" panel — pure server component, no client state.
// Renders the AtsView produced by computeAtsView() into a two-column layout:
//   - Left: the JD's must/nice-to-have keywords with traffic-light status
//   - Right: the structural checks an ATS would flag
// Top: headline ATS score + summary numbers.

import {
  Eye, CheckCircle2, AlertTriangle, XCircle, ShieldCheck,
} from "lucide-react";
import type { AtsView } from "@/lib/matching/ats-view";

const STATUS = {
  present: { tone: "text-success",     bg: "bg-success/10",     border: "border-success/30",     label: "Match", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  weak:    { tone: "text-warning",     bg: "bg-warning/10",     border: "border-warning/30",     label: "Weak",  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  missing: { tone: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Miss",  icon: <XCircle className="h-3.5 w-3.5" /> },
} as const;

function scoreTone(score: number) {
  if (score >= 80) return { ring: "stroke-success",     text: "text-success",     label: "Application-ready" };
  if (score >= 60) return { ring: "stroke-warning",     text: "text-warning",     label: "Workable with edits" };
  return                  { ring: "stroke-destructive", text: "text-destructive", label: "Likely auto-rejected" };
}

export function RecruiterView({ view }: { view: AtsView }) {
  const tone = scoreTone(view.ats_score);
  const circumference = 2 * Math.PI * 28;
  const dash = (view.ats_score / 100) * circumference;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Eye className="h-3 w-3" /> What the recruiter sees
          </div>
          <h3 className="mt-2 text-base font-semibold">ATS keyword scan</h3>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
            What a Workday / Greenhouse / iCIMS keyword-match engine sees when your resume is parsed against this JD.
            Deterministic — same resume × JD always produces the same view.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 64 64" className="absolute inset-0">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
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

      {/* Summary strip — Sprint 6: dropped "Quantified bullets" and
          "Structural checks" cells. Those are resume-wide observations
          (same on every job) so they don't belong on a job-specific view.
          They live on /profile#resume-score where they get fixed once. */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <SummaryStat label="Must-haves matched" value={`${view.summary.must_present} / ${view.summary.must_total}`} pct={view.summary.must_coverage_pct} tone="primary" />
        <SummaryStat label="Nice-to-haves matched" value={`${view.summary.nice_present} / ${view.summary.nice_total}`} pct={view.summary.nice_coverage_pct} tone="primary" />
      </div>

      {/* Keywords only — the JD-specific signal. The structural-checks
          column moved to the profile page (it's the same on every job). */}
      <div className="space-y-4">
        <KeywordBlock title="Must-have keywords (JD)" rows={view.must_haves} emptyHint="JD doesn't name any must-have skills explicitly. ATS keyword-match has nothing to score against." />
        <KeywordBlock title="Nice-to-have keywords (JD)" rows={view.nice_to_haves} emptyHint="No nice-to-haves named in the JD." />
      </div>

      <footer className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-success" />
        Deterministic keyword + structure analysis. Not powered by an LLM. Re-runs reflect resume edits in real time.
      </footer>
    </section>
  );
}

function SummaryStat({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: "primary" | "warning" | "success" }) {
  const fill = {
    primary: "bg-primary",
    warning: "bg-warning",
    success: "bg-success",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{value}</p>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KeywordBlock({ title, rows, emptyHint }: { title: string; rows: AtsView["must_haves"]; emptyHint: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <ul className="divide-y divide-border">
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
                  <p className="mt-0.5 text-[11px] text-destructive/80">No mention on resume — likely auto-filtered.</p>
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
