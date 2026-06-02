import type { ParsedResume } from "../llm/prompts/resume-parse";

const INDIA_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India"];

const FORBIDDEN_TEXT_PATTERNS = [
  /translate\s+bullets?\s+to\s+product[-\s]?co(?:mpany)?\s+language/i,
  /rewrite\s+(?:each\s+)?bullet/i,
  /not\s+(?:available|specified|mentioned|provided)/i,
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
];

const SERVICE_STYLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/^responsible for\s+/i, "Owned "],
  [/^worked on\s+/i, "Built "],
  [/^involved in\s+/i, "Contributed to "],
  [/^assisted (?:in|with)\s+/i, "Supported "],
  [/^participated in\s+/i, "Contributed to "],
  [/^handled\s+/i, "Owned "],
  [/^maintained\s+/i, "Improved "],
];

export function sanitizeParsedResume(parsed: ParsedResume): ParsedResume {
  const techStack = cleanStringList(parsed.tech_stack);
  const productsBuilt = cleanStringList(parsed.products_built);
  const projects = (parsed.projects ?? [])
    .map((project) => ({
      name: cleanText(project.name),
      description: cleanOptionalText(project.description),
      highlights: cleanBulletList(project.highlights ?? []),
      tech: cleanStringList(project.tech ?? []),
    }))
    .filter((project) => project.name.length > 0);

  const projectNames = new Set(projects.map((project) => project.name.toLowerCase()));
  for (const name of productsBuilt) {
    if (!projectNames.has(name.toLowerCase())) {
      projects.push({ name, description: "", highlights: [], tech: [] });
      projectNames.add(name.toLowerCase());
    }
  }

  return {
    ...parsed,
    name: cleanText(parsed.name),
    current_role: cleanText(parsed.current_role),
    role_function: cleanText(parsed.role_function),
    target_role_functions: cleanStringList(parsed.target_role_functions),
    total_years_experience: finiteNumber(parsed.total_years_experience, 0),
    tech_stack: techStack,
    soft_skills: cleanStringList(parsed.soft_skills),
    products_built: productsBuilt.length > 0 ? productsBuilt : projects.map((project) => project.name),
    companies: (parsed.companies ?? [])
      .map((company) => ({
        ...company,
        name: cleanText(company.name),
        role: cleanText(company.role),
        years: finiteNumber(company.years, 0),
        is_product_company: Boolean(company.is_product_company),
        start_date: cleanOptionalText(company.start_date),
        end_date: cleanOptionalText(company.end_date),
        summary: cleanOptionalText(company.summary),
        highlights: cleanBulletList(company.highlights ?? []),
      }))
      .filter((company) => company.name.length > 0 || company.role.length > 0),
    projects,
    certifications: (parsed.certifications ?? [])
      .map((cert) => ({
        name: cleanText(cert.name),
        issuer: cleanOptionalText(cert.issuer),
        date: cleanOptionalText(cert.date),
      }))
      .filter((cert) => cert.name.length > 0),
    education: (parsed.education ?? [])
      .map((edu) => ({
        degree: cleanText(edu.degree),
        institution: cleanText(edu.institution),
        ...(typeof edu.year === "number" && Number.isFinite(edu.year) ? { year: edu.year } : {}),
      }))
      .filter((edu) => edu.degree.length > 0 || edu.institution.length > 0),
    summary: cleanOptionalText(parsed.summary),
    product_dna_score: clamp(finiteNumber(parsed.product_dna_score, 0), 0, 100),
    estimated_current_lpa: typeof parsed.estimated_current_lpa === "number" && Number.isFinite(parsed.estimated_current_lpa)
      ? parsed.estimated_current_lpa
      : undefined,
    preferred_hubs: cleanStringList(parsed.preferred_hubs ?? []).filter((hub) => INDIA_HUBS.includes(hub)),
  };
}

function cleanStringList(items: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items ?? []) {
    const cleaned = cleanText(item);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function cleanBulletList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const cleaned = polishBullet(cleanText(item));
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 6);
}

function cleanOptionalText(value: string | undefined): string {
  return cleanText(value ?? "");
}

function cleanText(value: string): string {
  const cleaned = value
    .replace(/^[\s\-–—•*]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (FORBIDDEN_TEXT_PATTERNS.some((pattern) => pattern.test(cleaned))) return "";
  return cleaned;
}

function polishBullet(value: string): string {
  let out = value;
  for (const [pattern, replacement] of SERVICE_STYLE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  if (!out) return "";
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out.length > 260 ? `${out.slice(0, 257).trimEnd()}...` : out;
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
