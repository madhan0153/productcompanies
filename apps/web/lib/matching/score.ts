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

/** Phase G: scoreTechV3 — must-haves are 3× nice-to-haves.
 *  When JD-parsed must/nice arrays are missing (jobs not yet backfilled), it
 *  falls back to the legacy bag-of-tech Jaccard against `jobTech`. */
export function scoreTechV3(
  resumeTech: string[],
  jobMustHave: string[],
  jobNiceToHave: string[],
  fallbackJobTech: string[],
): number {
  const resumeDomains = skillsToDomains(resumeTech);
  const has = (skill: string): boolean => {
    const dom = skillsToDomains([skill]);
    for (const d of dom) if (resumeDomains.has(d)) return true;
    return false;
  };

  // No structured signal AND no fallback — partial credit.
  const haveStructured = jobMustHave.length > 0 || jobNiceToHave.length > 0;
  if (!resumeTech.length) return 8;

  if (haveStructured) {
    const mustHits = jobMustHave.filter(has).length;
    const niceHits = jobNiceToHave.filter(has).length;
    const mustTotal = jobMustHave.length;
    const niceTotal = jobNiceToHave.length;

    // Weight schema:
    //   - must-have coverage: 0..16 (80% of dimension)
    //   - nice-to-have coverage: 0..4  (20% of dimension)
    // Why: a JD with 5/5 must-haves missing should NOT be saved by 8/8 nice-to-have hits.
    const mustScore = mustTotal === 0 ? 12 : Math.round((mustHits / mustTotal) * 16);
    const niceScore = niceTotal === 0 ? 2  : Math.round((niceHits / niceTotal) * 4);

    return Math.min(20, mustScore + niceScore);
  }

  // Fallback to legacy domain Jaccard against the bag-of-tech.
  if (!fallbackJobTech.length) return 8;
  const a = resumeDomains;
  const b = skillsToDomains(fallbackJobTech);
  const inter = [...a].filter((d) => b.has(d)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((inter / union) * 20);
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
    role_function: string | null;
    // Years requirement: prefer JD-parsed (structured) over crawler-extracted.
    min_experience_years: number | null;
    max_experience_years: number | null;
    jd_min_years?: number | null;
    jd_max_years?: number | null;
    // Tech: prefer JD-parsed must/nice arrays; fall back to bag-of-tech.
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

  const role       = scoreRoleFunction(profile.target_role_functions, job.role_function);
  const experience = scoreExperienceV2(profile.years_experience, yMin, yMax);
  const tech       = scoreTechV3(
    profile.tech_stack,
    job.must_have_skills ?? [],
    job.nice_to_have_skills ?? [],
    job.tech_stack,
  );
  const seniority  = scoreSeniority(profile.seniority, jdSeniority);
  const hub        = scoreHubV2(profile.preferred_hubs, job.hubs);
  const lpa        = scoreLpaV2(profile.target_lpa, job.comp_lpa_max);
  const total      = role + experience + tech + seniority + hub + lpa;

  // Hard mismatch: role completely wrong AND both sides are known
  const hardMismatch =
    role === 0 &&
    profile.target_role_functions.length > 0 &&
    job.role_function !== null &&
    job.role_function !== "other";

  return { total, breakdown: { role, experience, tech, seniority, hub, lpa }, hardMismatch };
}
