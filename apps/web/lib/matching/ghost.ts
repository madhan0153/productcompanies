// Ghost-job detection. Cheap, runs alongside JD parse.
//
// A "ghost" job is one that's still listed but no longer real — old reposts,
// evergreen pipeline postings, or generic catch-alls that resolve to "we
// already filled this." Surfacing them as Strong Fits demoralises users who
// then waste an evening tailoring a resume for nothing. Better to flag and
// gate.
//
// Three signals, any TWO trip the flag:
//   1. AGE — posted_at older than 60 days OR last_seen_at lagging the latest
//      crawl by > 14 days.
//   2. BOILERPLATE — JD parser flagged is_boilerplate:true, OR ghost_reasons
//      contains specific patterns we trust.
//   3. NO CONCRETE TECH — must_have_skills is empty after JD parse (the parser
//      is conservative; an empty array means the JD genuinely never named a
//      tech).
//
// Returns the boolean flag plus a JSON blob with the per-signal evidence so
// we can show "why" in the UI when the user expands the warning.

export type GhostInput = {
  posted_at: string | null;
  last_seen_at: string | null;
  is_boilerplate: boolean;
  ghost_reasons: string[];
  must_have_skills: string[];
};

export type GhostSignals = {
  age_days: number | null;
  last_seen_lag_days: number | null;
  boilerplate: boolean;
  no_concrete_tech: boolean;
  ghost_reasons: string[];
};

export type GhostResult = {
  is_likely_ghost: boolean;
  signals: GhostSignals;
};

const STALE_AGE_DAYS = 60;
const LAST_SEEN_LAG_DAYS = 14;

function daysBetween(iso: string | null, ref = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((ref.getTime() - d.getTime()) / 86400000);
}

export function detectGhost(input: GhostInput): GhostResult {
  const ageDays = daysBetween(input.posted_at);
  const lagDays = daysBetween(input.last_seen_at);

  const ageStale = ageDays !== null && ageDays > STALE_AGE_DAYS;
  const lastSeenStale = lagDays !== null && lagDays > LAST_SEEN_LAG_DAYS;

  const boilerplate = input.is_boilerplate;
  const noConcreteTech = (input.must_have_skills?.length ?? 0) === 0;

  // Two-of-three rule. Each "signal" can fire from any of its sub-conditions.
  const trippedAge = ageStale || lastSeenStale;
  const trippedBoiler = boilerplate;
  const trippedTech = noConcreteTech;

  const tripCount = [trippedAge, trippedBoiler, trippedTech].filter(Boolean).length;

  return {
    is_likely_ghost: tripCount >= 2,
    signals: {
      age_days: ageDays,
      last_seen_lag_days: lagDays,
      boilerplate,
      no_concrete_tech: noConcreteTech,
      ghost_reasons: input.ghost_reasons ?? [],
    },
  };
}
