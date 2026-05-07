// Rules-based scoring layer — redesigned v2.
// New score composition: 0–100 total (no Gemini score contribution).
// Gemini is used only for explanations (strengths/gaps/reasoning), not ranking.
//
// Dimensions:
//   Role Function Match  0–40  (most important — eliminates type mismatches)
//   Experience           0–20  (asymmetric — overqualified OK, underqualified penalised)
//   Tech Domain          0–20  (semantic grouping, not raw Jaccard)
//   Seniority Alignment  0–10
//   Location             0–6
//   Compensation         0–4   (soft filter only)

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

/** Score 0–40 based on whether the job's function matches candidate's target functions. */
export function scoreRoleFunction(
  candidateFunctions: string[], // target_role_functions from profile
  jobFunction: string | null,
): number {
  // Either side unknown → neutral partial credit (no hard mismatch possible)
  if (!jobFunction || !candidateFunctions.length) return 15;

  // Exact match
  if (candidateFunctions.includes(jobFunction)) return 40;

  // Adjacent match
  const adjacent = candidateFunctions.flatMap((f) => ROLE_ADJACENCY[f] ?? []);
  if (adjacent.includes(jobFunction)) return 22;

  // Complete mismatch
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Experience — asymmetric (only penalise under-qualification)
// ─────────────────────────────────────────────────────────────────────────────

/** Score 0–20. Over-qualification is fine; under-qualification is penalised. */
export function scoreExperienceV2(
  resumeYears: number | null,
  minExp: number | null,
  maxExp: number | null,
): number {
  if (resumeYears === null) return 10;
  if (minExp === null && maxExp === null) return 14; // no requirement stated

  const lo = minExp ?? 0;
  const hi = maxExp ?? 999; // treat open-ended max as unlimited

  // In range: full score
  if (resumeYears >= lo && resumeYears <= hi) return 20;

  if (resumeYears > hi) {
    // Over-qualified — can do the job, might be bored
    const over = resumeYears - hi;
    if (over <= 3) return 18;
    if (over <= 6) return 14;
    return 10; // extreme over-qualification but still possible
  }

  // Under-qualified — might not be able to do the job
  const under = lo - resumeYears;
  if (under <= 1) return 14;
  if (under <= 2) return 8;
  if (under <= 3) return 3;
  return 0;
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

/** Phase G: scoreTechV3 — must-haves are 4× nice-to-haves.
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

  if (!resumeTech.length) return 6;

  const haveStructured = jobMustHave.length > 0 || jobNiceToHave.length > 0;

  if (haveStructured) {
    const mustHits = jobMustHave.filter(has).length;
    const niceHits = jobNiceToHave.filter(has).length;
    const mustTotal = jobMustHave.length;
    const niceTotal = jobNiceToHave.length;
    const mustScore = mustTotal === 0 ? 12 : Math.round((mustHits / mustTotal) * 16);
    const niceScore = niceTotal === 0 ? 2  : Math.round((niceHits / niceTotal) * 4);
    return Math.min(20, mustScore + niceScore);
  }

  // Fallback path: union of crawled tech_stack + fresh extraction from JD body.
  const fromDescription = jobDescription ? extractTechFromDescription(jobDescription) : [];
  const merged = [...new Set([...fallbackJobTech, ...fromDescription])];
  if (merged.length === 0) return 4; // truly no signal — low partial credit

  const a = resumeDomains;
  const b = skillsToDomains(merged);
  const inter = [...a].filter((d) => b.has(d)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((inter / union) * 20);
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

/** Score 0–10. */
export function scoreSeniority(
  candidateSeniority: string | null,
  jobSeniority: string | null,
): number {
  if (!candidateSeniority || !jobSeniority) return 5;
  const c = SENIORITY_LEVEL[candidateSeniority] ?? 2;
  const j = SENIORITY_LEVEL[jobSeniority] ?? 2;
  const diff = c - j; // positive = over-levelled, negative = under-levelled
  if (diff === 0) return 10;
  if (diff === 1) return 8;  // one level over: very common, totally fine
  if (diff === 2) return 5;  // two over: manager targeting IC lead, plausible
  if (diff === -1) return 6; // one under: stretching, borderline
  if (diff === -2) return 2; // two under: significant stretch
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location
// ─────────────────────────────────────────────────────────────────────────────

const NCR_GROUP = new Set(["Gurugram", "Noida", "Delhi NCR"]);

/** Score 0–6. */
export function scoreHubV2(
  preferredHubs: string[],
  jobHubs: string[],
): number {
  if (!preferredHubs.length || !jobHubs.length) return 3;
  if (jobHubs.includes("Remote-India")) return 6;
  if (preferredHubs.some((h) => jobHubs.includes(h))) return 6;
  if (
    preferredHubs.some((h) => NCR_GROUP.has(h)) &&
    jobHubs.some((h) => NCR_GROUP.has(h))
  ) return 4;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compensation — soft filter only
// ─────────────────────────────────────────────────────────────────────────────

/** Score 0–4. */
export function scoreLpaV2(
  targetLpa: number | null,
  compLpaMax: number | null,
): number {
  if (!compLpaMax || !targetLpa) return 2;
  if (targetLpa <= compLpaMax) return 4;
  const ratio = targetLpa / compLpaMax;
  if (ratio <= 1.3) return 2;
  if (ratio <= 1.6) return 1;
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
  // Marketing / Comms / PR / Content / Brand
  { pattern: /\b(marketing manager|brand manager|growth marketer|seo|sem|content marketing|copywriter|pr manager|public relations|communications manager|community manager)\b/i, conflictsWith: ALL_TECH_FUNCTIONS },
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
  total: number; // 0–100
  breakdown: {
    role: number;
    experience: number;
    tech: number;
    seniority: number;
    hub: number;
    lpa: number;
  };
  /** true when role function is a definite mismatch — caller should skip this job */
  hardMismatch: boolean;
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
    title?: string | null;       // for title-based hard-mismatch + role inference
    description?: string | null; // for fresh keyword extraction when bag-of-tech is stale
    role_function: string | null;
    // Years requirement: prefer JD-parsed (structured) over crawler-extracted.
    min_experience_years: number | null;
    max_experience_years: number | null;
    jd_min_years?: number | null;
    jd_max_years?: number | null;
    // Tech: prefer JD-parsed must/nice arrays; fall back to bag-of-tech ∪ fresh extraction.
    tech_stack: string[];
    must_have_skills?: string[] | null;
    nice_to_have_skills?: string[] | null;
    seniority: string | null;
    jd_seniority_signal?: string | null;
    hubs: string[];
    comp_lpa_max: number | null;
  },
): RulesScore {
  // Use JD-parsed years when available; otherwise fall back to crawler regex.
  const yMin = job.jd_min_years ?? job.min_experience_years;
  const yMax = job.jd_max_years ?? job.max_experience_years;

  // Use JD-parsed seniority signal when available; otherwise the crawler tag.
  const jdSeniority = job.jd_seniority_signal ?? job.seniority;

  // role_function on jobs is NULL for 88%+ of production rows until the
  // classifier backfills. Fall back to title-based inference so a clearly
  // labelled "Senior Data Engineer" gets a real role score now, not the
  // 15/40 neutral-credit consolation. Marked with a `_inferred` suffix in
  // tests but the score function doesn't care — same string match.
  const effectiveRoleFunction =
    job.role_function ?? inferRoleFunctionFromTitle(job.title ?? null);

  const role       = scoreRoleFunction(profile.target_role_functions, effectiveRoleFunction);
  const experience = scoreExperienceV2(profile.years_experience, yMin, yMax);
  const tech       = scoreTechV3(
    profile.tech_stack,
    job.must_have_skills ?? [],
    job.nice_to_have_skills ?? [],
    job.tech_stack,
    job.description ?? undefined,
  );
  const seniority  = scoreSeniority(profile.seniority, jdSeniority);
  const hub        = scoreHubV2(profile.preferred_hubs, job.hubs);
  const lpa        = scoreLpaV2(profile.target_lpa, job.comp_lpa_max);
  const total      = role + experience + tech + seniority + hub + lpa;

  // Hard mismatch:
  // (a) effective role function is known (DB or title-inferred) and the
  //     candidate function score is 0 — e.g. a data_engineering candidate vs
  //     a title-inferred ml_ai role still gets adjacency credit (22), but
  //     vs a frontend role lands at 0.
  // (b) explicit pattern-match against obvious non-tech titles (sales,
  //     facilities, finops, support …) for any tech function.
  const explicitMismatch =
    role === 0 &&
    profile.target_role_functions.length > 0 &&
    effectiveRoleFunction !== null &&
    effectiveRoleFunction !== "other";

  const titleMismatch = titleHardMismatch(job.title ?? "", profile.target_role_functions);

  const hardMismatch = explicitMismatch || titleMismatch;

  return { total, breakdown: { role, experience, tech, seniority, hub, lpa }, hardMismatch };
}
