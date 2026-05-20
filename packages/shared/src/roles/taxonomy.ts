export const CANONICAL_ROLE_FUNCTIONS = [
  "qa_sdet",
  "backend",
  "frontend",
  "fullstack",
  "data_analytics",
  "data_engineering",
  "ml_ai",
  "devops_platform",
  "mobile",
  "cybersecurity",
  "engineering_management",
  "product_management",
  "program_management",
  "design",
  "other",
] as const;

export type CanonicalRoleFunction = (typeof CANONICAL_ROLE_FUNCTIONS)[number];

export const ROLE_FUNCTION_LABELS: Record<CanonicalRoleFunction, string> = {
  qa_sdet: "QA / SDET",
  backend: "Backend",
  frontend: "Frontend",
  fullstack: "Full-stack",
  data_analytics: "Data analytics",
  data_engineering: "Data engineering",
  ml_ai: "ML / AI",
  devops_platform: "DevOps / SRE",
  mobile: "Mobile",
  cybersecurity: "Cybersecurity",
  engineering_management: "Engineering management",
  product_management: "Product management",
  program_management: "Program management",
  design: "UI/UX design",
  other: "Other",
};

const ROLE_ALIASES: Record<string, CanonicalRoleFunction> = {
  qa_test: "qa_sdet",
  quality_assurance: "qa_sdet",
  sdet: "qa_sdet",
  data_science: "ml_ai",
  machine_learning: "ml_ai",
  ml_platform: "ml_ai",
  ai_ml: "ml_ai",
  devops_sre: "devops_platform",
  platform: "devops_platform",
  sre: "devops_platform",
  security: "cybersecurity",
  appsec: "cybersecurity",
  cyber_security: "cybersecurity",
  product: "product_management",
  product_manager: "product_management",
  tpm: "program_management",
  technical_program_manager: "program_management",
  project_manager: "program_management",
  program_manager: "program_management",
  engineering_manager: "engineering_management",
  ui_ux: "design",
  ux: "design",
  android: "mobile",
  ios: "mobile",
};

export const ROLE_ADJACENCY: Record<CanonicalRoleFunction, CanonicalRoleFunction[]> = {
  qa_sdet: ["qa_sdet", "backend", "devops_platform"],
  backend: ["backend", "fullstack", "devops_platform"],
  frontend: ["frontend", "fullstack", "design"],
  fullstack: ["fullstack", "backend", "frontend"],
  data_analytics: ["data_analytics", "data_engineering", "ml_ai"],
  data_engineering: ["data_engineering", "data_analytics", "ml_ai"],
  ml_ai: ["ml_ai", "data_analytics", "data_engineering"],
  devops_platform: ["devops_platform", "backend", "cybersecurity"],
  mobile: ["mobile", "frontend"],
  cybersecurity: ["cybersecurity", "devops_platform", "backend"],
  engineering_management: ["engineering_management", "backend", "frontend", "fullstack", "qa_sdet", "devops_platform"],
  product_management: ["product_management", "program_management", "design", "data_analytics"],
  program_management: ["program_management", "product_management", "engineering_management"],
  design: ["design", "frontend", "product_management"],
  other: ["other"],
};

function tokeniseRole(input: string): string {
  return input.trim().toLowerCase().replace(/[\s/-]+/g, "_");
}

export function normalizeRoleFunction(input: string | null | undefined): CanonicalRoleFunction | null {
  if (!input) return null;
  const token = tokeniseRole(input);
  if ((CANONICAL_ROLE_FUNCTIONS as readonly string[]).includes(token)) {
    return token as CanonicalRoleFunction;
  }
  return ROLE_ALIASES[token] ?? null;
}

export function normalizeRoleFunctions(values: readonly string[] | null | undefined): CanonicalRoleFunction[] {
  return [...new Set((values ?? []).map(normalizeRoleFunction).filter((v): v is CanonicalRoleFunction => Boolean(v)))];
}
