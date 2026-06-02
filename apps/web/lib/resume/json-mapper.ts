// Bidirectional mapping between ProdMatch's internal ParsedResume shape and
// the open JSON Resume v1.0.0 spec.
//
//   ParsedResume → JsonResume:  used on export and as the "starting JSON
//                                Resume" for users whose only resume so far
//                                came from the Gemini parser.
//
//   JsonResume → ParsedResume:  used on import. Some fields ParsedResume
//                                cares about (is_product_company, role_function)
//                                aren't in JSON Resume — those get sensible
//                                defaults and a `product_dna_score` of 0,
//                                with a flag for the matcher to recompute.
//
// Privacy: this module operates on resume content that is PII. It must never
// log its inputs or outputs. Throwing is the only allowed side effect, and
// thrown errors must not include resume text — only schema-shape diagnostics.

import {
  type JsonResume,
  type JsonResumeWork,
  type JsonResumeEducation,
  type JsonResumeProject,
  EMPTY_JSON_RESUME,
} from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

// ── ParsedResume → JsonResume ──────────────────────────────────────────────

/**
 * Convert ProdMatch's internal parsed shape to a portable JSON Resume.
 *
 * Loss table (documented so reviewers understand the asymmetry):
 *   - role_function, target_role_functions, product_dna_score → stashed in
 *     meta.* under x-prodmatch keys so a round-trip through this and the
 *     reverse mapper preserves them.
 *   - is_product_company → stored per-company in work[].x-prodmatch-product.
 *
 * Schema extensions live under `x-prodmatch-*` keys (JSON Resume convention
 * for vendor extensions; passthrough on the zod schema preserves them).
 */
export function parsedResumeToJson(parsed: ParsedResume): JsonResume {
  const work: JsonResumeWork[] = parsed.companies.map((c) => ({
    name: c.name,
    position: c.role,
    startDate: normalizeDate(c.start_date),
    endDate: normalizeDate(c.end_date),
    summary: c.summary || undefined,
    highlights: c.highlights ?? [],
    ...({ "x-prodmatch-product": c.is_product_company } as Record<string, unknown>),
    ...({ "x-prodmatch-years": c.years } as Record<string, unknown>),
  } as JsonResumeWork));

  const education: JsonResumeEducation[] = parsed.education.map((e) => ({
    institution: e.institution,
    area: e.degree,
    studyType: e.degree,
    startDate: undefined,
    endDate: e.year ? `${e.year}` : undefined,
    courses: [],
  }));

  const skills = buildSkills(parsed.tech_stack, parsed.soft_skills);

  // Prefer the rich `projects` (description / highlights / tech) when present;
  // fall back to the legacy products_built (names only) for older parses.
  const projects: JsonResumeProject[] = (parsed.projects && parsed.projects.length > 0)
    ? parsed.projects.map((p) => ({
        name: p.name,
        description: p.description || undefined,
        highlights: p.highlights ?? [],
        keywords: p.tech ?? [],
        roles: [],
      }))
    : parsed.products_built.map((p) => ({
        name: p,
        description: undefined,
        highlights: [],
        keywords: [],
        roles: [],
      }));

  const certificates = (parsed.certifications ?? []).map((c) => ({
    name: c.name,
    issuer: c.issuer || undefined,
    date: normalizeDate(c.date),
  }));

  return {
    basics: {
      name: parsed.name,
      label: parsed.current_role,
      summary: parsed.summary,
      location: parsed.preferred_hubs?.[0]
        ? { city: parsed.preferred_hubs[0], countryCode: "IN" }
        : { countryCode: "IN" },
      profiles: [],
    },
    work,
    education,
    skills,
    projects,
    awards: [],
    certificates,
    languages: [],
    interests: [],
    meta: {
      version: "v1.0.0",
      lastModified: new Date().toISOString(),
      ...({ "x-prodmatch-role-function": parsed.role_function } as Record<string, unknown>),
      ...({ "x-prodmatch-target-functions": parsed.target_role_functions } as Record<string, unknown>),
      ...({ "x-prodmatch-dna-score": parsed.product_dna_score } as Record<string, unknown>),
      ...({ "x-prodmatch-current-lpa": parsed.estimated_current_lpa } as Record<string, unknown>),
      ...({ "x-prodmatch-preferred-hubs": parsed.preferred_hubs ?? [] } as Record<string, unknown>),
      ...({ "x-prodmatch-total-years": parsed.total_years_experience } as Record<string, unknown>),
    },
  };
}

// ── JsonResume → ParsedResume ──────────────────────────────────────────────

/**
 * Convert a JSON Resume document back to ProdMatch's ParsedResume shape.
 *
 * Defaults applied for fields JSON Resume doesn't carry natively:
 *   - role_function: "other" unless our x-prodmatch-role-function extension is present.
 *   - is_product_company: defaults to false; restored from x-prodmatch-product if present.
 *   - product_dna_score: 0 (the matcher will recompute on next compute pass).
 */
export function jsonToParsedResume(json: JsonResume): ParsedResume {
  const meta = (json.meta ?? {}) as Record<string, unknown>;

  const totalYears = readNumberMeta(meta, "x-prodmatch-total-years")
    ?? sumYears(json.work);

  const roleFunction = readStringMeta(meta, "x-prodmatch-role-function") ?? "other";
  const targetFunctions = readStringArrayMeta(meta, "x-prodmatch-target-functions");
  const dnaScore = readNumberMeta(meta, "x-prodmatch-dna-score") ?? 0;
  const currentLpa = readNumberMeta(meta, "x-prodmatch-current-lpa");
  const preferredHubs = readStringArrayMeta(meta, "x-prodmatch-preferred-hubs");

  const companies = json.work.map((w) => {
    const ext = w as unknown as Record<string, unknown>;
    return {
      name: w.name,
      role: w.position,
      years: typeof ext["x-prodmatch-years"] === "number"
        ? (ext["x-prodmatch-years"] as number)
        : estimateYears(w.startDate, w.endDate),
      is_product_company: typeof ext["x-prodmatch-product"] === "boolean"
        ? (ext["x-prodmatch-product"] as boolean)
        : false,
      start_date: w.startDate || undefined,
      end_date: w.endDate || undefined,
      summary: w.summary || undefined,
      highlights: w.highlights ?? [],
    };
  });

  // Rich projects round-trip so edits in the editor (description / highlights /
  // tech) survive submit → matching, not just the names.
  const projects = json.projects.map((p) => ({
    name: p.name,
    description: p.description || undefined,
    highlights: p.highlights ?? [],
    tech: p.keywords ?? [],
  }));

  const certifications = json.certificates.map((c) => ({
    name: c.name,
    issuer: c.issuer || undefined,
    date: c.date || undefined,
  }));

  const education = json.education.map((e) => {
    const y = parseYear(e.endDate);
    return {
      degree: e.studyType || e.area || "Degree",
      institution: e.institution,
      ...(y !== null ? { year: y } : {}),
    };
  });

  // Heuristic: a group named "Soft", "Soft Skills", "Communication", or
  // "Leadership" goes to soft_skills. Everything else falls to tech_stack.
  const softGroupNames = new Set(["soft skills", "soft", "communication", "leadership"]);
  const isSoftGroup = (groupName: string) => softGroupNames.has(groupName.toLowerCase());

  const techStack = json.skills
    .filter((s) => !isSoftGroup(s.name))
    .flatMap((s) => s.keywords)
    .filter((k, i, arr) => arr.indexOf(k) === i);

  const softSkills = json.skills
    .filter((s) => isSoftGroup(s.name))
    .flatMap((s) => s.keywords);

  const productsBuilt = json.projects.map((p) => p.name);

  return {
    name: json.basics.name,
    current_role: json.basics.label ?? "",
    role_function: roleFunction,
    target_role_functions: targetFunctions.length > 0 ? targetFunctions : [roleFunction],
    total_years_experience: totalYears,
    tech_stack: techStack,
    soft_skills: softSkills,
    products_built: productsBuilt,
    projects,
    certifications,
    companies,
    education,
    summary: json.basics.summary ?? "",
    product_dna_score: dnaScore,
    estimated_current_lpa: currentLpa,
    preferred_hubs: preferredHubs.length > 0 ? preferredHubs : undefined,
  };
}

/** Return an empty editable JSON Resume — used when a user has no resume yet. */
export function emptyJsonResume(): JsonResume {
  return JSON.parse(JSON.stringify(EMPTY_JSON_RESUME)) as JsonResume;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildSkills(tech: string[], soft: string[]) {
  const groups: { name: string; level?: string; keywords: string[] }[] = [];
  if (tech.length > 0) groups.push({ name: "Technical", keywords: dedupe(tech) });
  if (soft.length > 0) groups.push({ name: "Soft Skills", keywords: dedupe(soft) });
  return groups;
}

/** Trim a date-ish string; return undefined when empty so optional fields stay
 *  absent rather than empty strings. The JSON Resume schema is lenient about
 *  the exact format, so we pass values through as the parser/user supplied. */
function normalizeDate(v?: string | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const k = item.trim();
    if (!k) continue;
    const lower = k.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(k);
  }
  return out;
}

function sumYears(work: JsonResumeWork[]): number {
  let total = 0;
  for (const w of work) {
    const ext = w as unknown as Record<string, unknown>;
    if (typeof ext["x-prodmatch-years"] === "number") {
      total += ext["x-prodmatch-years"] as number;
      continue;
    }
    total += estimateYears(w.startDate, w.endDate);
  }
  return Math.round(total * 10) / 10;
}

function estimateYears(start?: string, end?: string): number {
  if (!start) return 0;
  const startYear = parseYear(start);
  const endYear = end && end.toLowerCase() !== "present" ? parseYear(end) : new Date().getFullYear();
  if (startYear === null || endYear === null) return 0;
  return Math.max(0, endYear - startYear);
}

function parseYear(s?: string): number | null {
  if (!s) return null;
  if (s.toLowerCase() === "present") return new Date().getFullYear();
  const m = s.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function readStringMeta(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" ? v : null;
}

function readNumberMeta(meta: Record<string, unknown>, key: string): number | undefined {
  const v = meta[key];
  return typeof v === "number" ? v : undefined;
}

function readStringArrayMeta(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
