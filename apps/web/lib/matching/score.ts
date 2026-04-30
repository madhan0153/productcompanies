// Rules-based scoring layer (0–60 points total).
// Combined with Gemini's 0–40 contribution = 0–100 final score.

const NCR_GROUP = new Set(["Gurugram", "Noida", "Delhi NCR"]);

export function scoreExperience(
  resumeYears: number | null,
  minExp: number | null,
  maxExp: number | null,
): number {
  if (resumeYears === null) return 8;
  if (minExp === null && maxExp === null) return 10;
  const lo = minExp ?? 0;
  const hi = maxExp ?? 99;
  if (resumeYears >= lo && resumeYears <= hi) return 15;
  const diff = resumeYears < lo ? lo - resumeYears : resumeYears - hi;
  if (diff <= 1) return 10;
  if (diff <= 2) return 6;
  if (diff <= 4) return 2;
  return 0;
}

export function scoreHub(
  preferredHubs: string[],
  jobHubs: string[],
): number {
  if (!preferredHubs.length) return 8;
  if (!jobHubs.length) return 8;
  if (jobHubs.includes("Remote-India")) return 12;
  const exact = preferredHubs.some((h) => jobHubs.includes(h));
  if (exact) return 15;
  const ncrOverlap =
    preferredHubs.some((h) => NCR_GROUP.has(h)) &&
    jobHubs.some((h) => NCR_GROUP.has(h));
  if (ncrOverlap) return 11;
  return 2;
}

export function scoreLpa(
  targetLpa: number | null,
  compLpaMax: number | null,
): number {
  if (compLpaMax === null || targetLpa === null) return 8;
  if (targetLpa <= compLpaMax) return 15;
  const ratio = targetLpa / compLpaMax;
  if (ratio <= 1.2) return 10;
  if (ratio <= 1.5) return 5;
  return 0;
}

export function scoreTechJaccard(
  resumeTech: string[],
  jobTech: string[],
): number {
  if (!resumeTech.length || !jobTech.length) return 5;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
  const a = new Set(resumeTech.map(norm));
  const b = new Set(jobTech.map(norm));
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((inter / union) * 15);
}

export interface RulesScore {
  total: number; // 0–60
  breakdown: {
    experience: number;
    hub: number;
    lpa: number;
    tech: number;
  };
}

export function computeRulesScore(
  profile: {
    years_experience: number | null;
    preferred_hubs: string[];
    target_lpa: number | null;
    tech_stack: string[];
  },
  job: {
    min_experience_years: number | null;
    max_experience_years: number | null;
    hubs: string[];
    comp_lpa_max: number | null;
    tech_stack: string[];
  },
): RulesScore {
  const experience = scoreExperience(profile.years_experience, job.min_experience_years, job.max_experience_years);
  const hub = scoreHub(profile.preferred_hubs, job.hubs);
  const lpa = scoreLpa(profile.target_lpa, job.comp_lpa_max);
  const tech = scoreTechJaccard(profile.tech_stack, job.tech_stack);
  return { total: experience + hub + lpa + tech, breakdown: { experience, hub, lpa, tech } };
}
