import type { RawJob, NormalizedJob, Seniority } from "@prodmatch/shared";
import { computeSignature } from "../lib/hash.js";

// ── Hub mapping ────────────────────────────────────────────────────────────────

const LOCATION_TO_HUB: Array<[RegExp, string]> = [
  [/bengaluru|bangalore|\bblr\b/i, "Bengaluru"],
  [/hyderabad|\bhyd\b/i, "Hyderabad"],
  [/\bpune\b/i, "Pune"],
  [/gurugram|gurgaon/i, "Gurugram"],
  [/\bnoida\b/i, "Noida"],
  [/\bdelhincr\b|delhi\s*ncr|\bncr\b|new delhi|\bdelhi\b/i, "Delhi NCR"],
  [/\bmumbai\b|bombay/i, "Mumbai"],
  [/\bchennai\b|madras/i, "Chennai"],
  [/remote.*india|india.*remote|work.from.home|wfh/i, "Remote-India"],
];

export function extractHubs(locationStr: string): string[] {
  const hubs = new Set<string>();
  for (const [re, hub] of LOCATION_TO_HUB) {
    if (re.test(locationStr)) hubs.add(hub);
  }
  // "India" with no city → Remote-India
  if (hubs.size === 0 && /\bindia\b/i.test(locationStr)) {
    hubs.add("Remote-India");
  }
  return [...hubs];
}

// ── Compensation ───────────────────────────────────────────────────────────────

export function extractLPA(text: string): { min: number | null; max: number | null } {
  const patterns: RegExp[] = [
    // "30-40 LPA", "30–40 lpa", "30 to 40 LPA"
    /(\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|l\.?p\.?a|lakhs?\s*per\s*annum|lacs?\s*per\s*annum)/i,
    // "₹30L - ₹40L"
    /₹\s*(\d+(?:\.\d+)?)\s*L\s*[-–]\s*₹\s*(\d+(?:\.\d+)?)\s*L/i,
    // "30 LPA" (single value)
    /(\d+(?:\.\d+)?)\s*(?:lpa|l\.?p\.?a|lakhs?\s*per\s*annum)/i,
    // "30 to 40 lakhs"
    /(\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const a = parseFloat(m[1]);
      const b = m[2] ? parseFloat(m[2]) : null;
      if (b) return { min: Math.min(a, b), max: Math.max(a, b) };
      return { min: a, max: a };
    }
  }
  return { min: null, max: null };
}

// ── Experience ─────────────────────────────────────────────────────────────────

export function extractExperienceYears(text: string): { min: number | null; max: number | null } {
  const patterns: RegExp[] = [
    /(\d+)\s*(?:[-–]|to)\s*(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(\d+)\+\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(?:minimum|at\s+least)\s+(\d+)\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(\d+)\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const a = parseInt(m[1]);
      const b = m[2] ? parseInt(m[2]) : null;
      if (b) return { min: Math.min(a, b), max: Math.max(a, b) };
      return { min: a, max: null };
    }
  }
  return { min: null, max: null };
}

// ── Tech stack ─────────────────────────────────────────────────────────────────

const TECH_KEYWORDS: string[] = [
  // Languages
  "python", "java", "golang", "go", "rust", "typescript", "javascript",
  "c++", "c#", "kotlin", "swift", "scala", "ruby", "php", "r",
  // Web frameworks
  "react", "next.js", "nextjs", "vue", "angular", "svelte",
  "node.js", "nodejs", "express", "fastify",
  "django", "flask", "fastapi", "spring boot", "spring",
  // Mobile
  "android", "ios", "react native", "flutter",
  // Infra / cloud
  "aws", "gcp", "azure", "kubernetes", "k8s", "docker",
  "terraform", "helm", "ansible",
  // Databases
  "postgresql", "postgres", "mysql", "mongodb", "redis",
  "elasticsearch", "cassandra", "dynamodb", "bigquery", "snowflake",
  // Data / ML
  "kafka", "spark", "hadoop", "airflow", "dbt",
  "pytorch", "tensorflow", "scikit-learn", "hugging face", "langchain", "llm",
  // Practices / tools
  "graphql", "grpc", "rest api", "microservices",
  "ci/cd", "jenkins", "github actions", "gitlab ci",
  "git", "linux",
];

const TECH_PATTERN_CACHE: Map<string, RegExp> = new Map(
  TECH_KEYWORDS.map((t) => [t, new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")])
);

export function extractTechStack(text: string): string[] {
  return TECH_KEYWORDS.filter((t) => TECH_PATTERN_CACHE.get(t)!.test(text));
}

// ── Seniority ──────────────────────────────────────────────────────────────────

export function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/intern|internship|apprentice/.test(t)) return "intern";
  if (/\bjunior\b|associate\b/.test(t)) return "junior";
  if (/\bstaff\b/.test(t)) return "staff";
  if (/\bprincipal\b/.test(t)) return "principal";
  if (/\bvp\b|vice\s+president/.test(t)) return "vp";
  if (/director/.test(t)) return "director";
  if (/manager/.test(t)) return "manager";
  if (/\blead\b/.test(t)) return "lead";
  if (/\bsenior\b|\bsr\.?\s/.test(t)) return "senior";
  return "mid";
}

// ── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeJob(raw: RawJob, companyId: string): NormalizedJob {
  const hubs = extractHubs(raw.location_raw);
  const { min: compMin, max: compMax } = extractLPA(raw.description);
  const { min: expMin, max: expMax } = extractExperienceYears(raw.description);
  const techStack = extractTechStack(`${raw.title} ${raw.description}`);
  const seniority = inferSeniority(raw.title);
  const signature = computeSignature(raw.title, raw.location_raw, raw.description);

  return {
    company_id: companyId,
    external_id: raw.external_id,
    signature,
    title: raw.title.trim(),
    description: raw.description,
    location: raw.location_raw,
    hubs,
    min_experience_years: expMin,
    max_experience_years: expMax,
    comp_lpa_min: compMin,
    comp_lpa_max: compMax,
    tech_stack: techStack,
    seniority,
    posted_at: raw.posted_at ?? null,
    raw: raw.raw,
  };
}
