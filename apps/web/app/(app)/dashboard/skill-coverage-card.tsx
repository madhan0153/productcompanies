// Sprint 6 — aggregate tech_coverage across the user's top-N matches and
// surface "skills you have that JDs ask for" vs "skills you don't, ranked
// by how often they appear in the JDs you're matched against."
//
// This is the single highest-value diagnostic for someone with a low avg
// score: it tells them exactly which 3-5 skills, if learned, would
// materially shift their match quality.

import Link from "next/link";
import { Layers, ChevronRight } from "lucide-react";

interface TcRow {
  direct?: string[];
  adjacent?: Array<{ jdSkill: string; via: string }>;
  missing?: string[];
}

export interface SkillCoverageInputs {
  /** Matches with non-null tech_coverage, ideally top-N by score. */
  rows: Array<{ score: number; tech_coverage: unknown }>;
}

export interface SkillCoverageOutput {
  /** Skills present in user's stack, frequency across analysed JDs. */
  haveAndDemanded: Array<{ skill: string; n: number }>;
  /** Missing skills, frequency. The actionable list. */
  missingDemanded: Array<{ skill: string; n: number }>;
  /** Adjacent matches (user has close cousin), frequency. */
  adjacentDemanded: Array<{ skill: string; via: string; n: number }>;
  /** Total JDs analysed. */
  jdsAnalysed: number;
}

export function aggregateSkillCoverage(input: SkillCoverageInputs): SkillCoverageOutput {
  const have = new Map<string, number>();
  const missing = new Map<string, number>();
  const adjacent = new Map<string, { via: string; n: number }>();

  let jdsAnalysed = 0;
  for (const r of input.rows) {
    const tc = r.tech_coverage as TcRow | null;
    if (!tc || typeof tc !== "object") continue;
    jdsAnalysed++;
    for (const s of tc.direct ?? []) have.set(s, (have.get(s) ?? 0) + 1);
    for (const s of tc.missing ?? []) missing.set(s, (missing.get(s) ?? 0) + 1);
    for (const a of tc.adjacent ?? []) {
      if (!a?.jdSkill || !a?.via) continue;
      const cur = adjacent.get(a.jdSkill);
      adjacent.set(a.jdSkill, { via: a.via, n: (cur?.n ?? 0) + 1 });
    }
  }

  return {
    haveAndDemanded: [...have.entries()]
      .map(([skill, n]) => ({ skill, n }))
      .sort((a, b) => b.n - a.n),
    missingDemanded: [...missing.entries()]
      .map(([skill, n]) => ({ skill, n }))
      .sort((a, b) => b.n - a.n),
    adjacentDemanded: [...adjacent.entries()]
      .map(([skill, v]) => ({ skill, via: v.via, n: v.n }))
      .sort((a, b) => b.n - a.n),
    jdsAnalysed,
  };
}

export function SkillCoverageCard({ data }: { data: SkillCoverageOutput }) {
  if (data.jdsAnalysed === 0) return null;

  const haveTop = data.haveAndDemanded.slice(0, 6);
  const missingTop = data.missingDemanded.slice(0, 6);
  const adjacentTop = data.adjacentDemanded.slice(0, 4);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold">Your skill coverage</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across your top {data.jdsAnalysed} ranked match{data.jdsAnalysed === 1 ? "" : "es"}
            </p>
          </div>
        </div>
        <Link
          href="/matches"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary focus-ring rounded"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Have */}
        <div className="rounded-md border border-success/20 bg-success/5 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-success">
            On your resume · {data.haveAndDemanded.length} matched
          </p>
          {haveTop.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No JD must-haves matched your stack directly yet.</p>
          ) : (
            <ul className="space-y-1">
              {haveTop.map((s) => (
                <li key={s.skill} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-foreground">{s.skill}</span>
                  <span className="shrink-0 tabular-nums text-success">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Missing */}
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-destructive">
            Often required, not on resume
          </p>
          {missingTop.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No common gaps in your top matches.</p>
          ) : (
            <ul className="space-y-1">
              {missingTop.map((s) => (
                <li key={s.skill} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-foreground">{s.skill}</span>
                  <span className="shrink-0 tabular-nums text-destructive">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
          {missingTop.length > 0 && (
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
              Learning the top 2 of these would lift many match scores.
            </p>
          )}
        </div>

        {/* Adjacent */}
        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-warning">
            Close cousins on your resume
          </p>
          {adjacentTop.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No adjacent skills detected yet.</p>
          ) : (
            <ul className="space-y-1">
              {adjacentTop.map((s) => (
                <li key={s.skill} className="text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">{s.skill}</span>
                    <span className="shrink-0 tabular-nums text-warning">{s.n}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/80">via {s.via}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
