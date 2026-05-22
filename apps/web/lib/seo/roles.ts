// Public-facing role slugs + display labels for the SEO route tree.
//
// The internal canonical names from @prodmatch/shared (e.g. "qa_sdet",
// "devops_platform") are good for taxonomy bookkeeping but ugly in URLs.
// This module is the one-stop translation surface for the public routes:
//
//   /roles/[slug]                  /companies/[slug]/[slug]   /cities/[hub]/[slug]
//
// All three accept the same slug list. The TARGET label is what we use in
// titles + headings ("Backend Engineer", "DevOps / SRE engineer"). The
// PLURAL is for listing pages ("Backend engineer jobs").

import {
  CANONICAL_ROLE_FUNCTIONS,
  ROLE_FUNCTION_LABELS,
  type CanonicalRoleFunction,
} from "@prodmatch/shared";

export interface PublicRole {
  /** URL-safe slug. */
  slug: string;
  /** Canonical role function key from @prodmatch/shared. */
  canonical: CanonicalRoleFunction;
  /** "Backend Engineer" — title-case singular. */
  label: string;
  /** "Backend Engineers" — plural for listing copy. */
  plural: string;
  /** "Backend Engineer Jobs" — exact-match query phrasing for the page title. */
  jobTitle: string;
}

const SLUG: Record<CanonicalRoleFunction, string> = {
  qa_sdet: "qa-sdet-engineer",
  backend: "backend-engineer",
  frontend: "frontend-engineer",
  fullstack: "full-stack-engineer",
  data_analytics: "data-analyst",
  data_engineering: "data-engineer",
  ml_ai: "ml-engineer",
  devops_platform: "devops-sre-engineer",
  mobile: "mobile-engineer",
  cybersecurity: "security-engineer",
  engineering_management: "engineering-manager",
  product_management: "product-manager",
  program_management: "program-manager",
  design: "product-designer",
  other: "engineer",
};

const PLURAL: Record<CanonicalRoleFunction, string> = {
  qa_sdet: "QA / SDET Engineers",
  backend: "Backend Engineers",
  frontend: "Frontend Engineers",
  fullstack: "Full-stack Engineers",
  data_analytics: "Data Analysts",
  data_engineering: "Data Engineers",
  ml_ai: "ML / AI Engineers",
  devops_platform: "DevOps / SRE Engineers",
  mobile: "Mobile Engineers",
  cybersecurity: "Security Engineers",
  engineering_management: "Engineering Managers",
  product_management: "Product Managers",
  program_management: "Program Managers",
  design: "Product Designers",
  other: "Engineers",
};

const LABEL: Record<CanonicalRoleFunction, string> = {
  qa_sdet: "QA / SDET Engineer",
  backend: "Backend Engineer",
  frontend: "Frontend Engineer",
  fullstack: "Full-stack Engineer",
  data_analytics: "Data Analyst",
  data_engineering: "Data Engineer",
  ml_ai: "ML / AI Engineer",
  devops_platform: "DevOps / SRE Engineer",
  mobile: "Mobile Engineer",
  cybersecurity: "Security Engineer",
  engineering_management: "Engineering Manager",
  product_management: "Product Manager",
  program_management: "Program Manager",
  design: "Product Designer",
  other: "Engineer",
};

export const PUBLIC_ROLES: readonly PublicRole[] = CANONICAL_ROLE_FUNCTIONS
  // Hide "other" from SEO surfaces — it's a catch-all, not a search target.
  .filter((c) => c !== "other")
  .map((canonical) => ({
    canonical,
    slug: SLUG[canonical],
    label: LABEL[canonical],
    plural: PLURAL[canonical],
    jobTitle: `${LABEL[canonical]} Jobs`,
  }));

const BY_SLUG: Map<string, PublicRole> = new Map(PUBLIC_ROLES.map((r) => [r.slug, r]));

export function publicRoleBySlug(slug: string): PublicRole | null {
  return BY_SLUG.get(slug.toLowerCase()) ?? null;
}

/**
 * Map any user-facing label or canonical key back to the public role.
 * Lenient — used when the crawler / JD parser emits a variant name we
 * still want to bucket into a known role page.
 */
export function publicRoleFromCanonical(canonical: string | null | undefined): PublicRole | null {
  if (!canonical) return null;
  return PUBLIC_ROLES.find((r) => r.canonical === canonical) ?? null;
}

/**
 * Re-export the labels for any caller that needs the underlying mapping.
 */
export { ROLE_FUNCTION_LABELS };
