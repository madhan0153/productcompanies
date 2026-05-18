// Sprint 6 matches redesign — aggregated missing-skills callout.
//
// Aggregates `tech_coverage.missing` across the user's current filtered
// view (NOT the whole catalog) so the callout updates when the user
// filters to company=Amazon vs company=Apple. Highest-value diagnostic
// for someone with low scores: tells them exactly which 3-5 skills, if
// learned, would lift the most JDs.

import Link from "next/link";
import { Target, ChevronRight } from "lucide-react";

interface TechCoverage {
  direct?: string[];
  adjacent?: Array<{ jdSkill: string; via: string }>;
  missing?: string[];
}

export interface MissingSkillsInput {
  rows: Array<{ score: number; tech_coverage: unknown }>;
}

export interface MissingSkill {
  skill: string;
  n: number;
  /** Highest score among rows where this skill is missing — proxy for "best opportunity if learned". */
  bestScore: number;
}

export function aggregateMissingSkills(input: MissingSkillsInput): {
  top: MissingSkill[];
  rowsAnalysed: number;
} {
  const acc = new Map<string, { n: number; bestScore: number }>();
  let rowsAnalysed = 0;
  for (const r of input.rows) {
    const tc = r.tech_coverage as TechCoverage | null;
    if (!tc || typeof tc !== "object") continue;
    rowsAnalysed++;
    for (const s of tc.missing ?? []) {
      const cur = acc.get(s);
      if (cur) {
        cur.n++;
        cur.bestScore = Math.max(cur.bestScore, r.score);
      } else {
        acc.set(s, { n: 1, bestScore: r.score });
      }
    }
  }
  const top = [...acc.entries()]
    .map(([skill, v]) => ({ skill, n: v.n, bestScore: v.bestScore }))
    .sort((a, b) => b.n - a.n);
  return { top, rowsAnalysed };
}

export function MissingSkillsBanner({
  data,
  scopeLabel,
}: {
  data: ReturnType<typeof aggregateMissingSkills>;
  scopeLabel: string;
}) {
  if (data.rowsAnalysed === 0 || data.top.length === 0) return null;
  const sample = data.top.slice(0, 5);

  return (
    <section className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5" aria-label="Skill gaps">
      <div className="flex items-center gap-2">
        <Target className="h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={2.25} />
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-warning">
          Missing skills <span className="font-normal text-muted-foreground">· {scopeLabel}</span>
        </p>
        <Link
          href="/coach"
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-primary hover:underline focus-ring rounded"
          aria-label="Ask the Coach which to learn first"
        >
          Coach <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1">
        {sample.map((s) => (
          <li key={s.skill}>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-card px-2 py-0.5 text-[10px]"
              title={`Missing in ${s.n} JD${s.n === 1 ? "" : "s"} · best score there: ${Math.round(s.bestScore)}`}
            >
              <span className="font-medium">{s.skill}</span>
              <span className="font-semibold tabular-nums text-warning">{s.n}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
