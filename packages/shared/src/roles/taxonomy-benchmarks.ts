import { normalizeRoleFunction, normalizeRoleFunctions, ROLE_ADJACENCY, type CanonicalRoleFunction } from "./taxonomy";

type RoleFixture = {
  family: string;
  resumeRole: string;
  targetRoles: string[];
  goodJobRole: string;
  badJobRole: string;
  expectedGood: CanonicalRoleFunction;
};

export const ROLE_TAXONOMY_FIXTURES: RoleFixture[] = [
  { family: "backend", resumeRole: "backend engineer", targetRoles: ["backend"], goodJobRole: "backend", badJobRole: "design", expectedGood: "backend" },
  { family: "frontend", resumeRole: "frontend engineer", targetRoles: ["frontend"], goodJobRole: "frontend", badJobRole: "data_engineering", expectedGood: "frontend" },
  { family: "full-stack", resumeRole: "fullstack engineer", targetRoles: ["fullstack"], goodJobRole: "backend", badJobRole: "cybersecurity", expectedGood: "backend" },
  { family: "data analytics", resumeRole: "business intelligence analyst", targetRoles: ["data_analytics"], goodJobRole: "data_engineering", badJobRole: "mobile", expectedGood: "data_engineering" },
  { family: "data engineering", resumeRole: "data engineer", targetRoles: ["data_engineering"], goodJobRole: "data_engineering", badJobRole: "frontend", expectedGood: "data_engineering" },
  { family: "machine learning", resumeRole: "machine learning engineer", targetRoles: ["machine_learning"], goodJobRole: "ml_ai", badJobRole: "qa_sdet", expectedGood: "ml_ai" },
  { family: "QA", resumeRole: "SDET", targetRoles: ["qa_test"], goodJobRole: "qa_sdet", badJobRole: "product_management", expectedGood: "qa_sdet" },
  { family: "DevOps/SRE", resumeRole: "site reliability engineer", targetRoles: ["devops_sre"], goodJobRole: "devops_platform", badJobRole: "design", expectedGood: "devops_platform" },
  { family: "cybersecurity", resumeRole: "application security engineer", targetRoles: ["security"], goodJobRole: "cybersecurity", badJobRole: "frontend", expectedGood: "cybersecurity" },
  { family: "mobile", resumeRole: "Android engineer", targetRoles: ["android"], goodJobRole: "mobile", badJobRole: "data_analytics", expectedGood: "mobile" },
  { family: "product manager", resumeRole: "product manager", targetRoles: ["product"], goodJobRole: "product_management", badJobRole: "qa_sdet", expectedGood: "product_management" },
  { family: "project/program manager", resumeRole: "technical program manager", targetRoles: ["tpm"], goodJobRole: "program_management", badJobRole: "backend", expectedGood: "program_management" },
  { family: "UI/UX/design", resumeRole: "product designer", targetRoles: ["ui_ux"], goodJobRole: "design", badJobRole: "devops_platform", expectedGood: "design" },
];

export function runRoleTaxonomyBenchmarks(): void {
  for (const fixture of ROLE_TAXONOMY_FIXTURES) {
    const targets = normalizeRoleFunctions(fixture.targetRoles);
    const good = normalizeRoleFunction(fixture.goodJobRole);
    const bad = normalizeRoleFunction(fixture.badJobRole);
    if (!targets.length || !good || !bad) {
      throw new Error(`Role taxonomy fixture did not normalize: ${fixture.family}`);
    }
    if (good !== fixture.expectedGood) {
      throw new Error(`Expected ${fixture.family} good job to normalize to ${fixture.expectedGood}, got ${good}`);
    }
    const adjacent = targets.flatMap((target) => ROLE_ADJACENCY[target] ?? []);
    if (!adjacent.includes(good)) {
      throw new Error(`Expected ${fixture.family} to accept ${good}`);
    }
    if (targets.includes(bad) || adjacent.includes(bad)) {
      throw new Error(`Expected ${fixture.family} to reject false positive ${bad}`);
    }
  }
}

if (process.argv[1]?.endsWith("taxonomy-benchmarks.ts")) {
  runRoleTaxonomyBenchmarks();
  console.log(`Role taxonomy benchmarks passed: ${ROLE_TAXONOMY_FIXTURES.length}`);
}
