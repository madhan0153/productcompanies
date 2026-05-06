// Pure functions that turn a list of jobs + a user's profile into the analytics
// the /insights and /coach pages render. No DB, no LLM — instant and free.

export type JobLite = {
  id?: string;
  company_id?: string | null;
  tech_stack: string[] | null;
  seniority: string | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
  hubs: string[] | null;
};

export type CompanyLite = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type ProfileLite = {
  tech_stack?: string[] | null;
  seniority?: string | null;
  preferred_hubs?: string[] | null;
  target_lpa?: number | null;
  current_lpa?: number | null;
};

// "react.js" / "ReactJS" / "react" → "react"
export function normTech(t: string): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.\-_]/g, "")
    .replace(/js$/, "");
}

export function applyJobFilters(
  jobs: JobLite[],
  filters: { seniority?: string | null; hub?: string | null },
): JobLite[] {
  let out = jobs;
  if (filters.seniority) {
    out = out.filter((j) => j.seniority === filters.seniority);
  }
  if (filters.hub) {
    out = out.filter((j) => (j.hubs ?? []).includes(filters.hub!));
  }
  return out;
}

export type Aggregates = {
  totalJobs: number;
  demand: Map<string, number>;
  sample: Map<string, string>;
  yours: Array<{ canon: string; label: string; jobs: number }>;
  gaps: Array<{ canon: string; label: string; jobs: number }>;
  topHubs: Array<[string, number]>;
  compStats: Array<{ seniority: string; n: number; median: number; top: number }>;
  coverage: number;
  userTech: Set<string>;
  // Set of canonical tokens that appear in the top-30 demand list
  top30Set: Set<string>;
};

const SENIORITY_BANDS = [
  "junior", "mid", "senior", "staff", "principal", "manager", "director",
] as const;

export function aggregate(jobs: JobLite[], profile: ProfileLite | null): Aggregates {
  const totalJobs = jobs.length;

  const demand = new Map<string, number>();
  const sample = new Map<string, string>();

  for (const j of jobs) {
    const seen = new Set<string>();
    for (const t of j.tech_stack ?? []) {
      const c = normTech(t);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      demand.set(c, (demand.get(c) ?? 0) + 1);
      if (!sample.has(c)) sample.set(c, t);
    }
  }

  const userTech = new Set(
    (profile?.tech_stack ?? []).map(normTech).filter(Boolean),
  );
  const userTechDisplay = new Map<string, string>(
    (profile?.tech_stack ?? []).map((t) => [normTech(t), t]),
  );

  const yours = [...userTech]
    .map((c) => ({
      canon: c,
      label: userTechDisplay.get(c) ?? sample.get(c) ?? c,
      jobs: demand.get(c) ?? 0,
    }))
    .sort((a, b) => b.jobs - a.jobs);

  const gaps = [...demand.entries()]
    .filter(([c]) => !userTech.has(c))
    .map(([c, n]) => ({ canon: c, label: sample.get(c) ?? c, jobs: n }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 10);

  const compStats = SENIORITY_BANDS
    .map((s) => {
      const buckets = jobs
        .filter((j) => j.seniority === s && (j.comp_lpa_max ?? j.comp_lpa_min))
        .map((j) => j.comp_lpa_max ?? j.comp_lpa_min ?? 0);
      if (buckets.length === 0) return null;
      buckets.sort((a, b) => a - b);
      const median = buckets[Math.floor(buckets.length / 2)];
      const top = buckets[Math.floor(buckets.length * 0.9)] ?? buckets[buckets.length - 1];
      return { seniority: s as string, n: buckets.length, median, top };
    })
    .filter((x): x is { seniority: string; n: number; median: number; top: number } => x !== null);

  const hubDemand = new Map<string, number>();
  for (const j of jobs) {
    for (const h of j.hubs ?? []) hubDemand.set(h, (hubDemand.get(h) ?? 0) + 1);
  }
  const topHubs = [...hubDemand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const top30Entries = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const top30Set = new Set(top30Entries.map(([c]) => c));
  const overlap = top30Entries.filter(([c]) => userTech.has(c)).length;
  const coverage = top30Entries.length > 0 ? Math.round((overlap / top30Entries.length) * 100) : 0;

  return { totalJobs, demand, sample, yours, gaps, topHubs, compStats, coverage, userTech, top30Set };
}

// "If you learned X, you'd unlock N more roles you currently don't qualify for."
// A role is considered an "unlock" if you currently overlap on at most 50% of its
// stack but adding the candidate token pushes you over a 60% overlap threshold.
export type Adjacency = {
  canon: string;
  label: string;
  unlocked: number; // number of additional roles this single skill would unlock
  totalDemand: number;
};

export function adjacencyUnlocks(jobs: JobLite[], profile: ProfileLite | null, max = 5): Adjacency[] {
  const userTech = new Set((profile?.tech_stack ?? []).map(normTech).filter(Boolean));
  if (userTech.size === 0) return [];

  // Per-job: list of canonical missing tokens, plus the count of currently-matching tokens
  const perJob = jobs.map((j) => {
    const tokens = (j.tech_stack ?? []).map(normTech).filter(Boolean);
    const dedup = [...new Set(tokens)];
    const matched = dedup.filter((c) => userTech.has(c)).length;
    const missing = dedup.filter((c) => !userTech.has(c));
    return { tokens: dedup, matched, missing };
  });

  const sample = new Map<string, string>();
  for (const j of jobs) {
    for (const t of j.tech_stack ?? []) {
      const c = normTech(t);
      if (c && !sample.has(c)) sample.set(c, t);
    }
  }

  // For every candidate skill (tokens that appear in any job missing-list), compute
  // how many roles flip from "below 60% match" to "≥60% match" if added to user.
  const candidates = new Map<string, number>();
  const totalDemand = new Map<string, number>();

  for (const j of perJob) {
    const total = j.tokens.length;
    if (total === 0) continue;
    const beforePct = j.matched / total;
    const afterMatched = j.matched + 1;
    const afterPct = afterMatched / total;
    if (beforePct >= 0.6 || afterPct < 0.6) {
      // Either you already qualify, or this single skill won't push you over.
      // Still count demand for ranking ties.
      for (const m of j.missing) {
        totalDemand.set(m, (totalDemand.get(m) ?? 0) + 1);
      }
      continue;
    }
    for (const m of j.missing) {
      candidates.set(m, (candidates.get(m) ?? 0) + 1);
      totalDemand.set(m, (totalDemand.get(m) ?? 0) + 1);
    }
  }

  return [...candidates.entries()]
    .map(([c, n]) => ({
      canon: c,
      label: sample.get(c) ?? c,
      unlocked: n,
      totalDemand: totalDemand.get(c) ?? n,
    }))
    .filter((x) => x.unlocked >= 2)
    .sort((a, b) => b.unlocked - a.unlocked || b.totalDemand - a.totalDemand)
    .slice(0, max);
}

// Companies hiring most for the user's stack — count overlapping techs per role.
export type CompanyDemand = {
  companyId: string;
  rolesTotal: number;
  rolesMatchingStack: number;
  matchedTechs: Map<string, number>;
};

export function companyStackDemand(
  jobs: JobLite[],
  profile: ProfileLite | null,
): CompanyDemand[] {
  const userTech = new Set((profile?.tech_stack ?? []).map(normTech).filter(Boolean));
  const byCompany = new Map<string, CompanyDemand>();

  for (const j of jobs) {
    if (!j.company_id) continue;
    let d = byCompany.get(j.company_id);
    if (!d) {
      d = { companyId: j.company_id, rolesTotal: 0, rolesMatchingStack: 0, matchedTechs: new Map() };
      byCompany.set(j.company_id, d);
    }
    d.rolesTotal += 1;

    const matches: string[] = [];
    const seen = new Set<string>();
    for (const t of j.tech_stack ?? []) {
      const c = normTech(t);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      if (userTech.has(c)) matches.push(c);
    }
    if (matches.length > 0) {
      d.rolesMatchingStack += 1;
      for (const c of matches) {
        d.matchedTechs.set(c, (d.matchedTechs.get(c) ?? 0) + 1);
      }
    }
  }

  return [...byCompany.values()]
    .filter((c) => c.rolesMatchingStack > 0)
    .sort((a, b) => b.rolesMatchingStack - a.rolesMatchingStack || b.rolesTotal - a.rolesTotal);
}
