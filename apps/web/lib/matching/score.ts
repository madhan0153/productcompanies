// Rules-based scoring layer — Phase I rebalance (semantic-led).
//
// Sprint 6 — added on top:
//   - analyzeTechCoverage: surfaces direct / adjacent / missing must-haves
//     using the cross-domain adjacency taxonomy in @prodmatch/shared.
//   - applyHardCaps: bounds the rubric total when key signals are weak
//     (thin JD, no stack overlap, senior role + no professional experience).
//     Caps do NOT hide the row (that's hardMismatch's job) — they prevent
//     inflated scores when the underlying evidence is thin.
//   - computeConfidence: 0–100 estimate of how trustworthy the score is,
//     derived from data completeness (embeddings, JD parse, years known…).
//
// The added fields on RulesScore are optional in shape but always set by
// computeRulesScore — older callers that destructure { total, breakdown,
// hardMismatch, hardMismatchReason, cosine } continue to work unchanged.
//
// Score composition: 0–100 total. The semantic alignment dimension (cosine
// similarity between resume embedding and JD embedding) is the biggest weight
// because a "Senior Data Engineer" title means nothing if the JD is actually
// about marketing analytics. Title and role_function are still scored, but
// content compatibility wins ties between similar-titled roles.
//
// Dimensions (Sprint 6 rebalance — dropped seniority + lpa + hub):
//   Semantic JD↔Resume   0–40  (cosine on Gemini text-embedding-004)
//   Tech (must/nice)     0–25  (must-have hits weighted 4× nice-to-have)
//   Role Function        0–21  (still important, no longer dominant)
//   Experience           0–14  (asymmetric: overqualified OK, under-qualified penalised)
// Total                  0–100
//
// Why we dropped seniority + lpa:
//   - Seniority signal was double-counted with experience (years already
//     captures it). The candidate's "seniority" field was rarely set and
//     when set, just re-flavoured what years_experience already said.
//   - Compensation was useless: 95%+ of JDs from the 18 product-co career
//     pages don't post salary bands. The dimension defaulted to 1/2 on
//     almost every match, distorting comparisons.
//   The 9 points are redistributed proportionally to the substantive dims.
//   The `senior_no_exp` hard cap (in applyHardCaps) still uses jdSeniority
//   because that's a JD-side signal, not the candidate's profile field.
//
// Why we dropped hub (location):
//   - Penalises candidates who haven't set preferences (most new users),
//     silently burying good matches.
//   - Location is already surfaced as a display filter in the UI; it does
//     not need to affect ranking. The 5 freed points redistributed to the
//     four substantive dimensions.

import { analyzeTechCoverage, type TechCoverage } from "@prodmatch/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Role function taxonomy
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_FUNCTIONS = [
  "qa_sdet",
  "backend",
  "frontend",
  "fullstack",
  "data_engineering",
  "ml_ai",
  "devops_platform",
  "mobile",
  "engineering_management",
  "product_management",
  "design",
  "security",
  "other",
] as const;

export type RoleFunction = (typeof ROLE_FUNCTIONS)[number];

// Which job functions are acceptable for each candidate function.
// First entry = exact match (40 pts), rest = adjacent (22 pts).
const ROLE_ADJACENCY: Record<string, string[]> = {
  qa_sdet:                ["qa_sdet"],
  backend:                ["backend", "fullstack"],
  frontend:               ["frontend", "fullstack"],
  fullstack:              ["fullstack", "backend", "frontend"],
  data_engineering:       ["data_engineering", "ml_ai"],
  ml_ai:                  ["ml_ai", "data_engineering"],
  devops_platform:        ["devops_platform", "backend"],
  mobile:                 ["mobile"],
  engineering_management: ["engineering_management", "backend", "frontend", "fullstack", "qa_sdet", "devops_platform"],
  product_management:     ["product_management"],
  design:                 ["design"],
  security:               ["security", "devops_platform"],
  other:                  ["other"],
};

/** Score 0–18 based on whether the job's function matches candidate's targets.
 *  Phase I: weight reduced from 40 → 18 so semantic alignment can dominate
 *  ranking among similar-titled roles. Hard-mismatch logic still uses the
 *  same role_function check, so filtering quality is unaffected. */
export function scoreRoleFunction(
  candidateFunctions: string[], // target_role_functions from profile
  jobFunction: string | null,
): number {
  if (!jobFunction || !candidateFunctions.length) return 7;
  if (candidateFunctions.includes(jobFunction)) return 18;
  const adjacent = candidateFunctions.flatMap((f) => ROLE_ADJACENCY[f] ?? []);
  if (adjacent.includes(jobFunction)) return 10;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Experience — asymmetric (only penalise under-qualification)
// ─────────────────────────────────────────────────────────────────────────────

/** Score 0–12. Asymmetric — under-qualification is heavily penalised.
 *  Returns the score AND a `tooFarBelow` flag so the engine can hard-mismatch
 *  jobs whose JD-stated minimum is way above the candidate's years
 *  (e.g. JD asks 8+ yrs for a Staff role, candidate has 4). */
export function scoreExperienceV2(
  resumeYears: number | null,
  minExp: number | null,
  maxExp: number | null,
): number {
  if (resumeYears === null) return 6;
  if (minExp === null && maxExp === null) return 8;

  const lo = minExp ?? 0;
  const hi = maxExp ?? 999;

  if (resumeYears >= lo && resumeYears <= hi) return 12;

  if (resumeYears > hi) {
    const over = resumeYears - hi;
    if (over <= 3) return 11;
    if (over <= 6) return 8;
    return 6;
  }

  const under = lo - resumeYears;
  if (under <= 1) return 8;
  if (under <= 2) return 5;
  if (under <= 3) return 2;
  return 0;
}

/** Returns true when the JD's stated minimum is so far above the candidate's
 *  years that they'd be filtered by an ATS (typically >3 yrs short of floor). */
export function isYearsGapHardMismatch(
  resumeYears: number | null,
  jdMinYears: number | null,
): boolean {
  if (resumeYears === null || jdMinYears === null) return false;
  return jdMinYears - resumeYears > 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tech domain — semantic grouping
// ─────────────────────────────────────────────────────────────────────────────

const TECH_DOMAINS: Record<string, string[]> = {
  test_automation:  ["selenium", "cypress", "playwright", "webdriverio", "puppeteer", "appium", "testcafe"],
  test_framework:   ["junit", "testng", "pytest", "jest", "mocha", "rspec", "nunit", "xunit", "jasmine", "vitest"],
  perf_testing:     ["jmeter", "k6", "locust", "gatling", "artillery", "wrk"],
  api_testing:      ["postman", "restassured", "karate", "soapui", "insomnia", "pact"],
  test_management:  ["testrail", "qtest", "zephyr", "xray", "testlink", "practitest"],
  bdd:              ["bdd", "cucumber", "behave", "specflow", "gherkin", "reqnroll"],
  ci_cd:            ["jenkins", "github actions", "githubactions", "gitlab", "circleci", "bamboo", "teamcity", "azuredevops", "travis", "buildkite"],
  backend_lang:     ["java", "python", "go", "golang", "rust", "csharp", "dotnet", "scala", "kotlin", "elixir", "ruby", "php"],
  frontend_lang:    ["javascript", "typescript"],
  backend_fw:       ["spring", "django", "fastapi", "flask", "nodejs", "express", "nestjs", "rails", "laravel", "fiber", "gin", "actix"],
  frontend_fw:      ["react", "vue", "angular", "nextjs", "svelte", "nuxt", "remix"],
  mobile:           ["swift", "kotlin", "reactnative", "flutter", "android", "ios", "xamarin"],
  database_sql:     ["postgresql", "mysql", "mssql", "oracle", "sqlite", "mariadb"],
  database_nosql:   ["mongodb", "dynamodb", "cassandra", "couchdb", "firestore"],
  cache_queue:      ["redis", "memcached", "rabbitmq", "kafka", "sqs", "pubsub", "nats"],
  search:           ["elasticsearch", "opensearch", "solr", "meilisearch", "typesense"],
  cloud:            ["aws", "gcp", "azure", "cloudrun", "lambda", "ec2", "s3", "gke", "eks"],
  container:        ["docker", "kubernetes", "helm", "terraform", "pulumi", "ansible"],
  data_stack:       ["spark", "kafka", "airflow", "dbt", "flink", "hadoop", "hive", "beam", "presto", "trino"],
  ml_stack:         ["pytorch", "tensorflow", "sklearn", "mlflow", "kubeflow", "langchain", "huggingface", "xgboost", "lightgbm"],
  observability:    ["datadog", "grafana", "prometheus", "newrelic", "splunk", "kibana", "sentry", "opentelemetry"],
};

function normSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9#+.]/g, "").trim();
}

function skillsToDomains(skills: string[]): Set<string> {
  const domains = new Set<string>();
  for (const skill of skills) {
    const n = normSkill(skill);
    for (const [domain, keywords] of Object.entries(TECH_DOMAINS)) {
      if (keywords.some((k) => n === normSkill(k) || n.includes(normSkill(k)))) {
        domains.add(domain);
      }
    }
    // Raw normalised token as fallback for unlisted tools
    domains.add(n);
  }
  return domains;
}

/**
 * Sprint 6 — Direct (exact or same-domain) match predicate.
 *
 * `analyzeTechCoverage` calls back into this to decide whether a JD must-have
 * is covered by the candidate's stack. Exported so the engine can pass it
 * unchanged into the analyser.
 */
export function isDirectTechMatch(resumeSkills: string[], jdSkill: string): boolean {
  const resumeDomains = skillsToDomains(resumeSkills);
  const jdDomains = skillsToDomains([jdSkill]);
  for (const d of jdDomains) {
    if (resumeDomains.has(d)) return true;
  }
  return false;
}

/** Phase I: scoreTechV3 — must-haves are 4× nice-to-haves. Max 22.
 *  When JD-parsed must/nice arrays are missing (jobs not yet backfilled), falls
 *  back to a domain-Jaccard between the resume and the union of (jobTech array,
 *  freshly-extracted skills from the JD description). The fresh extraction
 *  matters because the crawler's tech_stack is often stale: it was populated
 *  with an older keyword list that didn't know about Databricks / PySpark /
 *  Delta Lake / dbt / Snowflake / Redshift / etc. */
export function scoreTechV3(
  resumeTech: string[],
  jobMustHave: string[],
  jobNiceToHave: string[],
  fallbackJobTech: string[],
  jobDescription?: string,
): number {
  const resumeDomains = skillsToDomains(resumeTech);
  const has = (skill: string): boolean => {
    const dom = skillsToDomains([skill]);
    for (const d of dom) if (resumeDomains.has(d)) return true;
    return false;
  };

  if (!resumeTech.length) return 7;

  const haveStructured = jobMustHave.length > 0 || jobNiceToHave.length > 0;

  if (haveStructured) {
    const mustHits = jobMustHave.filter(has).length;
    const niceHits = jobNiceToHave.filter(has).length;
    const mustTotal = jobMustHave.length;
    const niceTotal = jobNiceToHave.length;
    // 80% / 20% split inside the 22-point dimension.
    const mustScore = mustTotal === 0 ? 13 : Math.round((mustHits / mustTotal) * 18);
    const niceScore = niceTotal === 0 ?  2 : Math.round((niceHits / niceTotal) *  4);
    return Math.min(22, mustScore + niceScore);
  }

  // Fallback path: union of crawled tech_stack + fresh extraction from JD body.
  const fromDescription = jobDescription ? extractTechFromDescription(jobDescription) : [];
  const merged = [...new Set([...fallbackJobTech, ...fromDescription])];
  if (merged.length === 0) return 5; // truly no signal — low partial credit

  const a = resumeDomains;
  const b = skillsToDomains(merged);
  const inter = [...a].filter((d) => b.has(d)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((inter / union) * 22);
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic JD ↔ Resume — Phase I
// ─────────────────────────────────────────────────────────────────────────────

/** Score 0–35 from cosine similarity between resume + JD Gemini embeddings.
 *  - cosine ≥ 0.85 → 35 (extremely tight match)
 *  - cosine ≥ 0.70 → linear 22..35
 *  - cosine ≥ 0.55 → linear 8..22
 *  - cosine <  0.55 → 0 (semantic mismatch)
 *  Returns a partial-credit fallback (12) when either side has no embedding,
 *  so jobs queued for embedding don't get instantly buried. */
export function scoreSemanticFit(cosine: number | null): number {
  if (cosine === null || !Number.isFinite(cosine)) return 12;
  if (cosine >= 0.85) return 35;
  if (cosine >= 0.70) return Math.round(22 + ((cosine - 0.70) / 0.15) * 13);
  if (cosine >= 0.55) return Math.round(8  + ((cosine - 0.55) / 0.15) * 14);
  return 0;
}

// Quick keyword extraction from a JD description blob. Mirrors the crawler's
// keyword set so behaviour stays in sync, but lives here so the engine doesn't
// need to import from packages/crawler.
const JD_TECH_KEYWORDS: string[] = [
  // Languages
  "python", "java", "golang", "go", "rust", "typescript", "javascript",
  "c++", "c#", "kotlin", "swift", "scala", "ruby", "php",
  // Frameworks
  "react", "next.js", "nextjs", "vue", "angular", "svelte",
  "node.js", "nodejs", "express", "fastify", "nestjs",
  "django", "flask", "fastapi", "spring boot", "spring",
  "android", "ios", "react native", "flutter",
  // Cloud / infra
  "aws", "gcp", "azure", "kubernetes", "k8s", "docker",
  "terraform", "helm", "ansible", "cloudformation",
  // Databases
  "postgresql", "postgres", "mysql", "mongodb", "redis",
  "elasticsearch", "opensearch", "cassandra", "dynamodb",
  "bigquery", "snowflake", "redshift", "clickhouse",
  // Data engineering — modern stack
  "databricks", "pyspark", "delta lake", "deltalake",
  "azure data factory", "adf", "adls", "synapse", "fabric",
  "data factory", "data lake", "data warehouse",
  // Streaming
  "kafka", "kinesis", "pub/sub", "pubsub", "rabbitmq", "sqs", "event hubs",
  // Batch / orchestration
  "spark", "hadoop", "hive", "flink", "beam",
  "airflow", "dbt", "dagster", "prefect",
  // ML / DS
  "pytorch", "tensorflow", "scikit-learn", "sklearn",
  "hugging face", "huggingface", "langchain", "llamaindex",
  "mlflow", "kubeflow", "ray",
  "llm", "openai", "anthropic", "gemini", "rag",
  // Observability
  "datadog", "grafana", "prometheus", "splunk", "sentry", "opentelemetry",
  // Practices
  "graphql", "grpc", "rest api", "microservices",
  "ci/cd", "jenkins", "github actions", "gitlab ci",
];

const JD_TECH_PATTERNS = JD_TECH_KEYWORDS.map((t) =>
  new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
);

function extractTechFromDescription(description: string): string[] {
  if (!description) return [];
  const text = description.slice(0, 8000); // cap; JDs can have boilerplate appendices
  const out: string[] = [];
  for (let i = 0; i < JD_TECH_KEYWORDS.length; i++) {
    if (JD_TECH_PATTERNS[i].test(text)) out.push(JD_TECH_KEYWORDS[i]);
  }
  return out;
}

/** Backwards-compat wrapper for callers still on the old signature. */
export function scoreTechDomain(resumeTech: string[], jobTech: string[]): number {
  return scoreTechV3(resumeTech, [], [], jobTech);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seniority alignment
// ─────────────────────────────────────────────────────────────────────────────

const SENIORITY_LEVEL: Record<string, number> = {
  intern: 0, junior: 1, mid: 2, senior: 3,
  staff: 4, principal: 4, manager: 4, director: 5,
};

/** Score 0–7. */
export function scoreSeniority(
  candidateSeniority: string | null,
  jobSeniority: string | null,
): number {
  if (!candidateSeniority || !jobSeniority) return 4;
  const c = SENIORITY_LEVEL[candidateSeniority] ?? 2;
  const j = SENIORITY_LEVEL[jobSeniority] ?? 2;
  const diff = c - j;
  if (diff === 0) return 7;
  if (diff === 1) return 6;
  if (diff === 2) return 4;
  if (diff === -1) return 4;
  if (diff === -2) return 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location
// ─────────────────────────────────────────────────────────────────────────────

const NCR_GROUP = new Set(["Gurugram", "Noida", "Delhi NCR"]);

/** Score 0–4. */
export function scoreHubV2(
  preferredHubs: string[],
  jobHubs: string[],
): number {
  if (!preferredHubs.length || !jobHubs.length) return 2;
  if (jobHubs.includes("Remote-India")) return 4;
  if (preferredHubs.some((h) => jobHubs.includes(h))) return 4;
  if (
    preferredHubs.some((h) => NCR_GROUP.has(h)) &&
    jobHubs.some((h) => NCR_GROUP.has(h))
  ) return 3;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compensation — soft filter only
// ─────────────────────────────────────────────────────────────────────────────

/** Score 0–2. */
export function scoreLpaV2(
  targetLpa: number | null,
  compLpaMax: number | null,
): number {
  if (!compLpaMax || !targetLpa) return 1;
  if (targetLpa <= compLpaMax) return 2;
  const ratio = targetLpa / compLpaMax;
  if (ratio <= 1.3) return 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Title-based hard-mismatch heuristic
// ─────────────────────────────────────────────────────────────────────────────
//
// When `job.role_function` is null (most production jobs are, until the
// Gemini classifier backfills them), we still need a way to filter out
// obvious non-fits. A "Senior Data Engineer" should never see "Sales
// Manager" or "Facilities In-charge" in their list — even if the role
// function is unknown.
//
// Each entry: a regex that matches an obvious non-engineering / non-product
// title, plus the SET of target role functions it conflicts with. If the
// candidate targets ANY function in that set, the title triggers
// hard-mismatch.

type TitleRule = { pattern: RegExp; conflictsWith: Set<string> };

const ENG_FUNCTIONS = new Set([
  "qa_sdet", "backend", "frontend", "fullstack",
  "data_engineering", "ml_ai", "devops_platform", "mobile",
  "engineering_management", "security",
]);

const ALL_TECH_FUNCTIONS = new Set([
  ...ENG_FUNCTIONS, "product_management", "design",
]);

const TITLE_HARD_MISMATCH: TitleRule[] = [
  // Sales / business / commercial — never hits an engineering candidate
  { pattern: /\b(sales|account executive|account manager|mid[- ]market account|business development|territory|partner manager|relationship manager|named account|cloud account|enterprise account|strategic account)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
  // Operations / facilities / warehouse / shift / vendor / procurement / admin
  { pattern: /\b(facilities|facility|warehouse|shift\s*incharge|vendor operations?|procurement|buyer|admin in[- ]?charge|operations? manager|operations? specialist|operations? lead|business operations|fleet|logistics|supply chain|store manager)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
  // Trust & Safety / Risk / Fraud / Policy — non-eng managerial paths
  { pattern: /\b(trust\s*(?:and|&)?\s*safety|t&s|policy specialist|fraud (?:investigator|analyst|operations)|risk operations|content moderation|content review)\b/i, conflictsWith: ENG_FUNCTIONS },
  // Customer-facing / GTM / consulting / TAM / support
  { pattern: /\b(customer success|customer engineer|technical account manager|solutions consultant|implementation consultant|onboarding manager|success manager|premier support|application support|technical support|support engineer)\b/i, conflictsWith: ENG_FUNCTIONS },
  // Recruiting / HR / People Ops / Talent
  { pattern: /\b(recruiter|recruiting|talent (?:acquisition|partner)|people operations?|people partner|hr business partner|hrbp|comp(?:ensation)? analyst)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
  // Finance / Accounting / Tax / Audit / Legal / FinOps
  { pattern: /\b(financial analyst|finance manager|accountant|accounting|tax (?:analyst|manager)|auditor?|treasur(?:y|er)|payroll|legal counsel|compliance officer|finops)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
  // Marketing / Comms / PR / Content / Brand / Growth-Manager
  { pattern: /\b(marketing manager|brand manager|growth manager|growth marketer|marketing analyst|marketing data scientist|business and marketing|seo|sem|content marketing|copywriter|pr manager|public relations|communications manager|community manager|business systems analyst|business analyst|apps specialist|measurement implementation)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
  // Program management / TPM / consulting / corp dev (engineering-management
  // candidates may genuinely target TPM, but pure engineers shouldn't).
  { pattern: /\b(technical program manager|tpm\b|program manager(?!\s*,?\s*engineering)|scaled delivery manager|digital transformation|corporate development|business systems|gtech|premier?\s+support)\b/i, conflictsWith: ENG_FUNCTIONS },
  // Hardware / Manufacturing — out of scope for software roles
  { pattern: /\b(circuit (?:design|engineer)|sram|asic|dft|hardware engineer|mechanical engineer|electrical engineer|power engineer|chip design|firmware engineer|embedded systems)\b/i, conflictsWith: new Set(["frontend", "fullstack", "backend", "data_engineering", "ml_ai", "qa_sdet", "devops_platform", "engineering_management", "product_management", "design"]) },
];

/** Hard mismatch via title pattern, used when role_function is unknown. */
export function titleHardMismatch(
  title: string,
  targetFunctions: string[],
): boolean {
  if (!title || targetFunctions.length === 0) return false;
  for (const rule of TITLE_HARD_MISMATCH) {
    if (!rule.pattern.test(title)) continue;
    if (targetFunctions.some((f) => rule.conflictsWith.has(f))) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Title-based role function inference
// ─────────────────────────────────────────────────────────────────────────────
//
// When `role_function` on jobs is null (88% of production jobs are, until the
// classifier backfills), infer from the title. This both:
//   - fills role_function in scoring so a "Senior Data Engineer @ Razorpay"
//     hits 40/40 on role match for a data_engineering candidate
//   - extends hard-mismatch detection to obvious function conflicts that the
//     hard-pattern list doesn't enumerate (PM, data scientist, etc.)
//
// Order matters: most specific patterns first.

const TITLE_FUNCTION_PATTERNS: Array<{ pattern: RegExp; fn: string }> = [
  // Highly specific / multi-token signatures first
  { pattern: /\b(data\s+engineer(?:ing)?|analytics engineer|etl developer|big data engineer)\b/i, fn: "data_engineering" },
  { pattern: /\b(machine learning engineer|ml engineer|ai engineer|deep learning|nlp engineer|computer vision)\b/i, fn: "ml_ai" },
  { pattern: /\b(data scientist|research scientist|applied scientist|quantitative researcher)\b/i, fn: "ml_ai" },
  { pattern: /\b(devops|sre|site reliability|platform engineer|infrastructure engineer|cloud engineer|build engineer|release engineer|reliability engineer)\b/i, fn: "devops_platform" },
  { pattern: /\b(security engineer|application security|appsec|product security|penetration tester|cyber.{0,15}engineer|red team|blue team)\b/i, fn: "security" },
  { pattern: /\b(android (?:engineer|developer)|ios (?:engineer|developer)|mobile (?:engineer|developer)|react native|flutter (?:engineer|developer))\b/i, fn: "mobile" },
  { pattern: /\b(qa engineer|quality engineer|sdet|test (?:automation|engineer)|automation engineer|quality assurance)\b/i, fn: "qa_sdet" },
  { pattern: /\b(frontend (?:engineer|developer)|front-end|ui engineer|ui developer|ux engineer|web (?:engineer|developer))\b/i, fn: "frontend" },
  { pattern: /\b(backend (?:engineer|developer)|back-end|server engineer|api engineer|distributed systems)\b/i, fn: "backend" },
  { pattern: /\b(full[\s-]*stack|fullstack)\b/i, fn: "fullstack" },
  { pattern: /\b(engineering manager|em\b|head of engineering|director of engineering|vp engineering|software engineering manager)\b/i, fn: "engineering_management" },
  { pattern: /\b(product manager|pm\b|product owner|technical product manager|tpm\b|group product manager)\b/i, fn: "product_management" },
  { pattern: /\b(ux designer|ui designer|product designer|design lead|interaction designer|visual designer)\b/i, fn: "design" },
  // Generic SWE last — captured as backend by default since most "SWE II" / "SDE" roles are server-side
  { pattern: /\b(software (?:engineer|developer)|sde\s*[ivx12345]+|swe\s*[ivx12345]+|systems engineer)\b/i, fn: "backend" },
];

/**
 * Best-effort role function inference from the job title alone. Returns null
 * when nothing matches.
 */
export function inferRoleFunctionFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  for (const { pattern, fn } of TITLE_FUNCTION_PATTERNS) {
    if (pattern.test(title)) return fn;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export interface RulesScore {
  total: number; // 0–100 — AFTER hard caps applied
  /** Pre-cap sum of weighted dimensions (useful for telemetry / debugging). */
  totalRaw: number;
  /**
   * Sprint 6 — seniority + lpa removed. Their values remain in the type as
   * `0` so legacy callers that destructure them keep compiling. Persisted
   * matches.score_breakdown stays a flexible jsonb; old rows retain their
   * shape, new rows omit those dims at the engine layer.
   */
  breakdown: {
    semantic: number;   // 0–40
    tech: number;       // 0–25
    role: number;       // 0–21
    experience: number; // 0–14
    /** @deprecated — always 0. Hub removed from formula; location shown as display filter only. */
    hub: number;
    /** @deprecated — always 0 in new computes. Kept for back-compat. */
    seniority: number;
    /** @deprecated — always 0 in new computes. Kept for back-compat. */
    lpa: number;
  };
  /** Set when the row should be hidden from the default list. */
  hardMismatch: boolean;
  /** What triggered the hard-mismatch (for logging / hidden_reason). */
  hardMismatchReason: "role_function" | "title_pattern" | "years_gap" | null;
  /** Sprint 6 — When set, the raw total exceeded this cap and was lowered.
   *  Distinct from hardMismatch: caps reduce, hardMismatch hides. */
  hardCapReason: HardCapReason | null;
  /** Sprint 6 — Direct / adjacent / missing breakdown of must-have tech. */
  techCoverage: TechCoverage | null;
  /** Sprint 6 — How trustworthy the score is, 0–100. */
  confidence: number;
  /** Cosine that fed scoreSemanticFit, exposed for debugging. null when no embedding. */
  cosine: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hard caps (Sprint 6)
// ─────────────────────────────────────────────────────────────────────────────
//
// Caps that reduce score WITHOUT hiding the row. Triggered when the data
// behind the score is too thin to justify the rubric total. The user still
// sees the role (hardMismatch is the lethal filter) but the score honestly
// reflects the missing signal.
//
// Order matters: most specific first. Only one reason recorded per row;
// the cap value itself is min'd across all triggered rules.

export type HardCapReason =
  | "thin_jd"          // JD body too short to score reliably
  | "no_stack"         // zero direct + zero adjacent must-have hits
  | "adjacent_only"    // matches exist but only via adjacency, no direct
  | "senior_no_exp"    // JD asks for senior+, candidate has <2 yrs pro exp
  ;

const CAPS: Record<HardCapReason, number> = {
  thin_jd:       70,
  no_stack:      50,
  adjacent_only: 70,
  senior_no_exp: 45,
};

const SENIOR_PLUS = new Set([
  "senior", "staff", "principal", "lead", "manager", "director", "vp",
]);

/**
 * Compute and apply hard caps to a raw rubric total.
 * Returns the capped score and the reason that fired (if any).
 */
export function applyHardCaps(input: {
  rawTotal: number;
  resumeYears: number | null;
  jdSeniority: string | null;
  description: string | null | undefined;
  hasMustHaves: boolean;
  techCoverage: TechCoverage | null;
}): { total: number; reason: HardCapReason | null } {
  const triggered: HardCapReason[] = [];

  // (1) Thin JD: too little signal to justify a high score, regardless of
  //     what embeddings or fallback heuristics produced.
  const descLen = (input.description ?? "").trim().length;
  if (descLen > 0 && descLen < 200) {
    triggered.push("thin_jd");
  }

  // (2) Stack overlap: only meaningful when the JD actually listed must-haves.
  //     If it did and the candidate has zero direct AND zero adjacent hits,
  //     no rubric weight should compensate for the missing core stack.
  if (input.hasMustHaves && input.techCoverage) {
    if (input.techCoverage.noCoverage) {
      triggered.push("no_stack");
    } else if (input.techCoverage.noDirect && input.techCoverage.adjacent.length > 0) {
      triggered.push("adjacent_only");
    }
  }

  // (3) Senior role × no professional experience. The semantic and tech
  //     dimensions can still mark a strong fit on paper (resume keywords
  //     match), but the candidate provably can't satisfy the years floor.
  if (
    input.resumeYears !== null &&
    input.resumeYears < 2 &&
    input.jdSeniority &&
    SENIOR_PLUS.has(input.jdSeniority.toLowerCase())
  ) {
    triggered.push("senior_no_exp");
  }

  if (triggered.length === 0) {
    return { total: Math.min(100, Math.max(0, input.rawTotal)), reason: null };
  }

  // Pick the strictest cap; tie-break by triggering order (most-specific first).
  let strictest: HardCapReason = triggered[0];
  for (const r of triggered) {
    if (CAPS[r] < CAPS[strictest]) strictest = r;
  }

  return {
    total: Math.min(input.rawTotal, CAPS[strictest]),
    reason: strictest,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence (Sprint 6)
// ─────────────────────────────────────────────────────────────────────────────
//
// 0–100 estimate of how trustworthy the score is, independent of the score
// itself. Useful pairing: "78 (conf 90)" reads very differently from
// "78 (conf 35)" — the UI can render the low-confidence row with a softer
// emphasis so users don't anchor on a flimsy number.

function computeConfidence(input: {
  cosine: number | null;
  jdSeniority: string | null;
  jdMinYears: number | null;
  jdMaxYears: number | null;
  hasMustHaves: boolean;
  hasJdSummary: boolean;
  descriptionLen: number;
  resumeYearsKnown: boolean;
}): number {
  let c = 100;
  if (input.cosine === null) c -= 20;        // semantic dim used fallback
  if (!input.hasMustHaves)    c -= 18;       // JD wasn't parsed yet
  if (!input.hasJdSummary)    c -= 6;
  if (input.jdMinYears === null && input.jdMaxYears === null) c -= 8;
  if (!input.jdSeniority)     c -= 5;
  if (input.descriptionLen > 0 && input.descriptionLen < 200) c -= 10;
  if (!input.resumeYearsKnown) c -= 8;
  return Math.max(30, Math.min(100, c));
}

export function computeRulesScore(
  profile: {
    target_role_functions: string[];
    years_experience: number | null;
    tech_stack: string[];
    seniority: string | null;
    preferred_hubs: string[];
    target_lpa: number | null;
  },
  job: {
    title?: string | null;
    description?: string | null;
    role_function: string | null;
    min_experience_years: number | null;
    max_experience_years: number | null;
    jd_min_years?: number | null;
    jd_max_years?: number | null;
    tech_stack: string[];
    must_have_skills?: string[] | null;
    nice_to_have_skills?: string[] | null;
    seniority: string | null;
    jd_seniority_signal?: string | null;
    hubs: string[];
    comp_lpa_max: number | null;
    /** Phase I: precomputed cosine(resume_embedding, job.embedding). Caller
     *  supplies it; null when either side has no embedding yet. */
    semantic_cosine?: number | null;
  },
): RulesScore {
  // Use JD-parsed years when available; otherwise fall back to crawler regex.
  const yMin = job.jd_min_years ?? job.min_experience_years;
  const yMax = job.jd_max_years ?? job.max_experience_years;

  const jdSeniority = job.jd_seniority_signal ?? job.seniority;
  const effectiveRoleFunction =
    job.role_function ?? inferRoleFunctionFromTitle(job.title ?? null);

  const cosine = job.semantic_cosine ?? null;

  // Scale inner function outputs to their new dim caps. seniority + lpa + hub
  // intentionally excluded (rationale at top of file).
  const semantic   = Math.round(scoreSemanticFit(cosine) * 40 / 35);                              // 0–40
  const tech       = Math.round(scoreTechV3(profile.tech_stack, job.must_have_skills ?? [],
                                 job.nice_to_have_skills ?? [], job.tech_stack,
                                 job.description ?? undefined) * 25 / 22);                        // 0–25
  const role       = Math.round(scoreRoleFunction(profile.target_role_functions, effectiveRoleFunction) * 21 / 18); // 0–21
  const experience = Math.round(scoreExperienceV2(profile.years_experience, yMin, yMax) * 14 / 12); // 0–14
  const totalRaw   = semantic + tech + role + experience;

  // Sprint 6 — Tech coverage breakdown (direct / adjacent / missing).
  // Only meaningful when the JD actually listed must-haves; otherwise null.
  const mustHaves = job.must_have_skills ?? [];
  const techCoverage = mustHaves.length > 0
    ? analyzeTechCoverage(profile.tech_stack, mustHaves, isDirectTechMatch)
    : null;

  // Sprint 6 — Apply hard caps. These reduce the score but never hide a row.
  const capped = applyHardCaps({
    rawTotal:      totalRaw,
    resumeYears:   profile.years_experience,
    jdSeniority,
    description:   job.description,
    hasMustHaves:  mustHaves.length > 0,
    techCoverage,
  });

  // Sprint 6 — Confidence (0–100) reflects data quality, not match quality.
  const confidence = computeConfidence({
    cosine,
    jdSeniority,
    jdMinYears:       yMin,
    jdMaxYears:       yMax,
    hasMustHaves:     mustHaves.length > 0,
    hasJdSummary:     Boolean(job.title), // crude proxy — JD summary lives on the engine side
    descriptionLen:   (job.description ?? "").length,
    resumeYearsKnown: profile.years_experience !== null,
  });

  // Hard mismatch ladder, most-specific first:
  let hardMismatchReason: RulesScore["hardMismatchReason"] = null;

  // (a) Title pattern matches an obvious non-fit (Sales / Facilities / TPM…)
  if (titleHardMismatch(job.title ?? "", profile.target_role_functions)) {
    hardMismatchReason = "title_pattern";
  }
  // (b) Effective role function is a known mismatch
  else if (
    role === 0 &&
    profile.target_role_functions.length > 0 &&
    effectiveRoleFunction !== null &&
    effectiveRoleFunction !== "other"
  ) {
    hardMismatchReason = "role_function";
  }
  // (c) JD asks for years far above the candidate's (Phase I).
  //     "Staff SDE — 8+ yrs" should not show up for a 4-year SDE I.
  else if (isYearsGapHardMismatch(profile.years_experience, yMin)) {
    hardMismatchReason = "years_gap";
  }

  return {
    total: capped.total,
    totalRaw,
    breakdown: { semantic, tech, role, experience, hub: 0, seniority: 0, lpa: 0 },
    hardMismatch: hardMismatchReason !== null,
    hardMismatchReason,
    hardCapReason: capped.reason,
    techCoverage,
    confidence,
    cosine,
  };
}
