// Matching banding benchmark — full pipeline (rules → calibrate → classify).
//
// Generates synthetic (resume × job) pairs across the role taxonomy and
// asserts: strong fits land in Priority (shortlist), adjacent in Explore
// (worth_a_look), clear mismatches in Filtered. Includes unparsed-JD cases
// because that's where the production bug was hiding.
//
// Run: pnpm test:matching-bench
//
// Privacy: every name / company / project here is fictional. No PII.

import test from "node:test";
import assert from "node:assert/strict";
import { computeRulesScore } from "../../lib/matching/score";
import { calibrateMatch, reconcileVerdictWithScore, type CalibrateJobInput } from "../../lib/matching/calibrate";
import { classifyMatch } from "../../app/(app)/matches/match-types";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface ResumeFixture {
  label: string;
  target_role_functions: string[];
  years_experience: number;
  tech_stack: string[];
  seniority: string;
  preferred_hubs: string[];
}

interface JobFixture {
  label: string;
  title: string;
  description: string;
  /** role_function set by the LLM JD parser (null when crawler hasn't enriched). */
  role_function: string | null;
  /** Mirror of role_function_jd column. Drives role-signal-conflict check. */
  role_function_jd: string | null;
  jd_parsed: boolean;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  tech_stack: string[];
  jd_min_years: number | null;
  jd_max_years: number | null;
  jd_seniority_signal: string | null;
  hubs: string[];
  embedded: boolean;
  cosineWhenEmbedded: number;
  quality_score: number;
  jd_summary: string | null;
  is_likely_ghost: boolean;
}

const RESUMES: ResumeFixture[] = [
  {
    label: "senior_backend",
    target_role_functions: ["backend"],
    years_experience: 6,
    tech_stack: ["typescript", "node.js", "postgres", "kafka", "redis", "docker", "kubernetes", "aws"],
    seniority: "senior",
    preferred_hubs: ["Bengaluru"],
  },
  {
    label: "mid_qa_sdet",
    target_role_functions: ["qa_sdet"],
    years_experience: 4,
    tech_stack: ["playwright", "cypress", "typescript", "junit", "selenium", "rest assured", "github actions"],
    seniority: "mid",
    preferred_hubs: ["Bengaluru", "Hyderabad"],
  },
  {
    label: "senior_data_engineer",
    target_role_functions: ["data_engineering"],
    years_experience: 7,
    tech_stack: ["pyspark", "databricks", "delta lake", "airflow", "dbt", "snowflake", "python", "aws", "kafka"],
    seniority: "senior",
    preferred_hubs: ["Pune", "Bengaluru"],
  },
  {
    label: "mid_frontend",
    target_role_functions: ["frontend"],
    years_experience: 4,
    tech_stack: ["react", "typescript", "next.js", "tailwindcss", "redux", "javascript"],
    seniority: "mid",
    preferred_hubs: ["Bengaluru"],
  },
  {
    label: "senior_ml_ai",
    target_role_functions: ["ml_ai"],
    years_experience: 6,
    tech_stack: ["pytorch", "huggingface", "langchain", "python", "llm", "rag", "aws", "kubernetes"],
    seniority: "senior",
    preferred_hubs: ["Bengaluru"],
  },
  {
    label: "mid_mobile",
    target_role_functions: ["mobile"],
    years_experience: 4,
    tech_stack: ["kotlin", "swift", "android", "ios", "jetpack compose", "swiftui"],
    seniority: "mid",
    preferred_hubs: ["Bengaluru"],
  },
];

function withDefaults(j: Partial<JobFixture> & { label: string; title: string }): JobFixture {
  return {
    description: "",
    role_function: null,
    role_function_jd: null,
    jd_parsed: true,
    must_have_skills: [],
    nice_to_have_skills: [],
    tech_stack: [],
    jd_min_years: null,
    jd_max_years: null,
    jd_seniority_signal: null,
    hubs: ["Bengaluru"],
    embedded: true,
    cosineWhenEmbedded: 0.5,
    quality_score: 100,
    jd_summary: null,
    is_likely_ghost: false,
    ...j,
  };
}

function jobsForBackend(): JobFixture[] {
  return [
    withDefaults({
      label: "direct_strong_backend",
      title: "Senior Backend Engineer, Payments",
      description: "Build distributed payment services on Kubernetes. Own scalability, reliability and observability. Required: TypeScript or Go, Postgres, Kafka, Kubernetes, AWS.".repeat(2),
      role_function: "backend",
      role_function_jd: "backend",
      must_have_skills: ["TypeScript", "Postgres", "Kafka", "Kubernetes", "AWS"],
      nice_to_have_skills: ["gRPC", "OpenTelemetry"],
      tech_stack: ["typescript", "postgres", "kafka", "kubernetes", "aws"],
      jd_min_years: 5, jd_max_years: 9, jd_seniority_signal: "senior",
      cosineWhenEmbedded: 0.82,
      jd_summary: "Senior backend engineer for payments platform.",
    }),
    withDefaults({
      label: "direct_unparsed_backend",
      title: "Backend Engineer III, Trading Systems",
      description: "Help us build the next generation of trading systems. Distributed, low-latency, observability-first. We use TypeScript on Node.js with Postgres and Kafka. AWS and Kubernetes everywhere.",
      role_function: null,
      role_function_jd: null,
      jd_parsed: false,
      tech_stack: ["typescript", "node.js", "postgres", "kafka", "aws"],
      cosineWhenEmbedded: 0.74,
    }),
    withDefaults({
      label: "adjacent_fullstack",
      title: "Full-stack Engineer (Node + React)",
      description: "Build features end-to-end. Node.js, React, Postgres. We're a small team.".repeat(8),
      role_function: "fullstack",
      role_function_jd: "fullstack",
      must_have_skills: ["Node.js", "React", "Postgres"],
      nice_to_have_skills: ["Redis"],
      tech_stack: ["node.js", "react", "postgres"],
      jd_min_years: 4, jd_max_years: 8, jd_seniority_signal: "mid",
      cosineWhenEmbedded: 0.62,
    }),
    withDefaults({
      label: "mismatch_frontend",
      title: "Senior Frontend Engineer, Design Systems",
      description: "Lead a design-system team. Ship React components. Must have: React, TypeScript, CSS architecture.".repeat(2),
      role_function: "frontend",
      role_function_jd: "frontend",
      must_have_skills: ["React", "TypeScript", "CSS"],
      tech_stack: ["react", "typescript", "css"],
      jd_min_years: 5, jd_max_years: 9, jd_seniority_signal: "senior",
      cosineWhenEmbedded: 0.46,
    }),
    withDefaults({
      label: "mismatch_sales",
      title: "Enterprise Account Executive, Cloud Sales",
      description: "Drive cloud sales pipeline. 5+ years in B2B SaaS sales.".repeat(4),
      must_have_skills: ["Cloud Sales"],
      jd_min_years: 5, jd_seniority_signal: "senior",
      cosineWhenEmbedded: 0.31,
    }),
  ];
}

function jobsForQa(): JobFixture[] {
  return [
    withDefaults({
      label: "direct_strong_qa",
      title: "SDET II, Platform Quality",
      description: "Build test automation frameworks. Playwright + TypeScript. Required: Playwright, TypeScript, CI/CD.".repeat(2),
      role_function: "qa_sdet",
      role_function_jd: "qa_sdet",
      must_have_skills: ["Playwright", "TypeScript", "CI/CD"],
      nice_to_have_skills: ["API Testing"],
      tech_stack: ["playwright", "typescript", "ci/cd"],
      jd_min_years: 3, jd_max_years: 6, jd_seniority_signal: "mid",
      cosineWhenEmbedded: 0.81,
    }),
    withDefaults({
      label: "direct_unparsed_qa",
      title: "Senior QA Engineer, Mobile",
      description: "Automation testing for our mobile apps. Use Appium, Selenium. We use Playwright on web. Looking for someone with 3+ years in test automation.",
      jd_parsed: false,
      tech_stack: ["appium", "selenium", "playwright"],
      hubs: ["Hyderabad"],
      cosineWhenEmbedded: 0.70,
    }),
    withDefaults({
      label: "mismatch_backend",
      title: "Senior Backend Engineer, Distributed Systems",
      description: "Build distributed payment services. Go, Postgres, Kafka. Senior+ only.".repeat(3),
      role_function: "backend",
      role_function_jd: "backend",
      must_have_skills: ["Go", "Postgres", "Kafka"],
      tech_stack: ["go", "postgres", "kafka"],
      jd_min_years: 6, jd_seniority_signal: "senior",
      cosineWhenEmbedded: 0.42,
    }),
  ];
}

function jobsForDataEng(): JobFixture[] {
  return [
    withDefaults({
      label: "direct_strong_de",
      title: "Senior Data Engineer, Lakehouse",
      description: "Build our medallion-architecture lakehouse on Databricks. Required: PySpark, Delta Lake, Airflow, AWS.".repeat(2),
      role_function: "data_engineering",
      role_function_jd: "data_engineering",
      must_have_skills: ["PySpark", "Delta Lake", "Airflow", "AWS"],
      nice_to_have_skills: ["dbt", "Snowflake"],
      tech_stack: ["pyspark", "delta lake", "airflow", "aws"],
      jd_min_years: 5, jd_max_years: 10, jd_seniority_signal: "senior",
      cosineWhenEmbedded: 0.84,
    }),
    withDefaults({
      label: "direct_unparsed_de",
      title: "Data Engineer III",
      description: "Build and maintain our data pipelines. Spark, Airflow, AWS. Help us scale to billions of rows.",
      jd_parsed: false,
      tech_stack: ["spark", "airflow", "aws"],
      cosineWhenEmbedded: 0.68,
    }),
  ];
}

// ── Harness — full pipeline ────────────────────────────────────────────────

function runFullPipeline(resume: ResumeFixture, job: JobFixture): {
  score: number;
  band: ReturnType<typeof classifyMatch>;
  hidden_reason: string | null;
  verdict: string;
  notes: string;
} {
  const rules = computeRulesScore(
    {
      target_role_functions: resume.target_role_functions,
      years_experience:      resume.years_experience,
      tech_stack:            resume.tech_stack,
      seniority:             resume.seniority,
      preferred_hubs:        resume.preferred_hubs,
      target_lpa:            null,
    },
    {
      title:                job.title,
      description:          job.description,
      role_function:        job.role_function,
      semantic_cosine:      job.embedded ? job.cosineWhenEmbedded : null,
      min_experience_years: null,
      max_experience_years: null,
      jd_min_years:         job.jd_min_years,
      jd_max_years:         job.jd_max_years,
      tech_stack:           job.tech_stack,
      must_have_skills:     job.must_have_skills,
      nice_to_have_skills:  job.nice_to_have_skills,
      seniority:            job.jd_seniority_signal,
      jd_seniority_signal:  job.jd_seniority_signal,
      hubs:                 job.hubs,
      comp_lpa_max:         null,
    },
  );

  const calibrateInput: CalibrateJobInput = {
    title:               job.title,
    description:         job.description,
    quality_score:       job.quality_score,
    jd_parsed_at:        job.jd_parsed ? new Date().toISOString() : null,
    jd_summary:          job.jd_summary,
    role_function_jd:    job.role_function_jd,
    must_have_skills:    job.must_have_skills,
    nice_to_have_skills: job.nice_to_have_skills,
    tech_stack:          job.tech_stack,
    is_likely_ghost:     job.is_likely_ghost,
  };
  const calibrated = calibrateMatch({ job: calibrateInput, rules, baseScore: rules.total });
  const band = classifyMatch({
    score:         calibrated.score,
    hidden_reason: calibrated.hidden_reason,
    seen_at:       null,
  });

  const notes =
    `score=${calibrated.score} verdict=${calibrated.verdict} hidden=${calibrated.hidden_reason ?? "—"} ` +
    `raw=${rules.totalRaw} sem=${rules.breakdown.semantic} tech=${rules.breakdown.tech} ` +
    `role=${rules.breakdown.role} exp=${rules.breakdown.experience} ` +
    `cap=${rules.hardCapReason ?? "—"} hardMis=${rules.hardMismatchReason ?? "—"}`;
  return { score: calibrated.score, band, hidden_reason: calibrated.hidden_reason, verdict: calibrated.verdict, notes };
}

// ── Tests ──────────────────────────────────────────────────────────────────

test("backend resume — direct strong job is Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const result = runFullPipeline(r, jobsForBackend().find((x) => x.label === "direct_strong_backend")!);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("backend resume — unparsed-JD direct match is NOT Filtered (must be visible)", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const result = runFullPipeline(r, jobsForBackend().find((x) => x.label === "direct_unparsed_backend")!);
  assert.notEqual(result.band, "filtered", `unparsed-but-clearly-matching backend job must be visible. ${result.notes}`);
});

test("backend resume — adjacent fullstack lands at Explore or Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const result = runFullPipeline(r, jobsForBackend().find((x) => x.label === "adjacent_fullstack")!);
  assert.notEqual(result.band, "filtered", `adjacent match should be visible. ${result.notes}`);
});

test("backend resume — pure frontend mismatch is NOT Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const result = runFullPipeline(r, jobsForBackend().find((x) => x.label === "mismatch_frontend")!);
  assert.notEqual(result.band, "shortlist", `frontend role must not be Priority for backend candidate. ${result.notes}`);
});

test("backend resume — sales job is Filtered (hard mismatch)", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const result = runFullPipeline(r, jobsForBackend().find((x) => x.label === "mismatch_sales")!);
  assert.equal(result.band, "filtered", `sales role MUST be filtered for backend candidate. ${result.notes}`);
});

test("verdict reconciliation - strong_fit cannot be stored below strong score band", () => {
  assert.equal(reconcileVerdictWithScore("strong_fit", 59), "stretch");
  assert.equal(reconcileVerdictWithScore("strong_fit", 39), "evidence_pending");
  assert.equal(reconcileVerdictWithScore("strong_fit", 75), "strong_fit");
});

test("data_engineering resume - compliance/operator title is Filtered despite Python keyword", () => {
  const r = RESUMES.find((x) => x.label === "senior_data_engineer")!;
  const j = withDefaults({
    label: "compliance_ops",
    title: "Prod Compliance Associate Sr, Brand Protection",
    description: "Review brand protection workflows. Use Python for reporting and compliance operations.".repeat(2),
    role_function: "ml_ai",
    role_function_jd: "ml_ai",
    must_have_skills: ["Python"],
    tech_stack: ["python"],
    jd_min_years: 1,
    jd_max_years: 5,
    jd_seniority_signal: "manager",
    cosineWhenEmbedded: 0.4,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "filtered", `non-engineering ops title must be filtered. ${result.notes}`);
});

test("qa_sdet resume — direct strong SDET role is Priority", () => {
  const r = RESUMES.find((x) => x.label === "mid_qa_sdet")!;
  const result = runFullPipeline(r, jobsForQa().find((x) => x.label === "direct_strong_qa")!);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("qa_sdet resume — unparsed QA role is visible (not Filtered)", () => {
  const r = RESUMES.find((x) => x.label === "mid_qa_sdet")!;
  const result = runFullPipeline(r, jobsForQa().find((x) => x.label === "direct_unparsed_qa")!);
  assert.notEqual(result.band, "filtered", `unparsed QA job must be visible. ${result.notes}`);
});

test("qa_sdet resume — backend role is NOT Priority", () => {
  const r = RESUMES.find((x) => x.label === "mid_qa_sdet")!;
  const result = runFullPipeline(r, jobsForQa().find((x) => x.label === "mismatch_backend")!);
  assert.notEqual(result.band, "shortlist", `backend role must not be Priority for QA candidate. ${result.notes}`);
});

test("data_engineering resume — direct strong DE role is Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_data_engineer")!;
  const result = runFullPipeline(r, jobsForDataEng().find((x) => x.label === "direct_strong_de")!);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("data_engineering resume - exact role and must-have coverage survives weak embedding", () => {
  const r = RESUMES.find((x) => x.label === "senior_data_engineer")!;
  const j = withDefaults({
    label: "weak_embedding_de",
    title: "Data Engineer II, Analytics Platform",
    description: "Build data pipelines with PySpark, SQL, dbt and Airflow. Own warehouse quality and batch processing.".repeat(3),
    role_function: "data_engineering",
    role_function_jd: "data_engineering",
    must_have_skills: ["PySpark", "SQL", "dbt", "Airflow"],
    tech_stack: ["pyspark", "sql", "dbt", "airflow"],
    jd_min_years: 3,
    jd_max_years: 6,
    jd_seniority_signal: "mid",
    cosineWhenEmbedded: 0.04,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "shortlist", `exact structured evidence should rescue weak embeddings. ${result.notes}`);
});

test("data_engineering resume — unparsed DE role is visible (not Filtered)", () => {
  const r = RESUMES.find((x) => x.label === "senior_data_engineer")!;
  const result = runFullPipeline(r, jobsForDataEng().find((x) => x.label === "direct_unparsed_de")!);
  assert.notEqual(result.band, "filtered", `unparsed DE job must be visible. ${result.notes}`);
});

test("fleet rollup — ≥85% of direct-role-match pairs land in Priority or Explore", () => {
  const allResumes = RESUMES;
  const allJobs = [...jobsForBackend(), ...jobsForQa(), ...jobsForDataEng()];
  let directMatches = 0;
  let visible = 0;
  const failures: string[] = [];
  for (const r of allResumes) {
    for (const j of allJobs) {
      const tgt = r.target_role_functions[0];
      // Effective function: from JD parser when available, else title inference
      // (we use role_function in the fixture as the parser's output).
      const fn = j.role_function ?? "";
      const adjacent = (fn === "fullstack" && tgt === "backend");
      const direct = tgt === fn;
      if (!direct && !adjacent) continue;
      directMatches++;
      const result = runFullPipeline(r, j);
      if (result.band !== "filtered") visible++;
      else failures.push(`${r.label} × ${j.label}: ${result.notes}`);
    }
  }
  assert.ok(directMatches > 0, "test setup must have direct matches");
  const visibility = visible / directMatches;
  if (visibility < 0.85) {
    console.error("Visibility failures:\n" + failures.join("\n"));
  }
  assert.ok(
    visibility >= 0.85,
    `expected ≥85% of direct matches visible; got ${(visibility * 100).toFixed(0)}% (${visible}/${directMatches})`,
  );
});

// ── Negative + edge cases ─────────────────────────────────────────────────

test("frontend resume — direct frontend role with parsed JD is Priority", () => {
  const r = RESUMES.find((x) => x.label === "mid_frontend")!;
  const j = withDefaults({
    label: "frontend_strong",
    title: "Frontend Engineer III, Web Platform",
    description: "Build the web app on React + TypeScript. We use Next.js, Tailwind. ".repeat(4),
    role_function: "frontend",
    role_function_jd: "frontend",
    must_have_skills: ["React", "TypeScript", "Next.js"],
    nice_to_have_skills: ["Tailwind CSS"],
    tech_stack: ["react", "typescript", "next.js"],
    jd_min_years: 3, jd_max_years: 7, jd_seniority_signal: "mid",
    cosineWhenEmbedded: 0.81,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("ml_ai resume — generative AI role is Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_ml_ai")!;
  const j = withDefaults({
    label: "ml_strong",
    title: "Senior AI Engineer, LLM Platform",
    description: "Build production LLM workflows. PyTorch, Hugging Face, LangChain, RAG. 5+ yrs. ".repeat(3),
    role_function: "ml_ai",
    role_function_jd: "ml_ai",
    must_have_skills: ["PyTorch", "LLM", "RAG"],
    nice_to_have_skills: ["LangChain"],
    tech_stack: ["pytorch", "llm", "rag", "huggingface"],
    jd_min_years: 5, jd_seniority_signal: "senior",
    cosineWhenEmbedded: 0.83,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("mobile resume — direct iOS role is Priority", () => {
  const r = RESUMES.find((x) => x.label === "mid_mobile")!;
  const j = withDefaults({
    label: "ios_strong",
    title: "Senior iOS Developer, Consumer App",
    description: "Ship features in Swift + SwiftUI. Required: Swift, iOS, SwiftUI. ".repeat(3),
    role_function: "mobile",
    role_function_jd: "mobile",
    must_have_skills: ["Swift", "iOS", "SwiftUI"],
    tech_stack: ["swift", "ios", "swiftui"],
    jd_min_years: 4, jd_seniority_signal: "mid",
    cosineWhenEmbedded: 0.80,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "shortlist", `expected shortlist, got ${result.band} (${result.notes})`);
});

test("ghost listing for direct role lands in Explore, not Priority", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const j: JobFixture = {
    ...jobsForBackend().find((x) => x.label === "direct_strong_backend")!,
    label: "ghost_backend",
    is_likely_ghost: true,
  };
  const result = runFullPipeline(r, j);
  assert.notEqual(result.band, "shortlist", `ghost listing should not be Priority. ${result.notes}`);
});

test("low quality_score job (empty/garbage) is Filtered regardless of role match", () => {
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const j = withDefaults({
    label: "low_quality_backend",
    title: "Backend Engineer",
    description: "x",
    role_function: "backend",
    role_function_jd: "backend",
    tech_stack: ["typescript"],
    quality_score: 20,
    jd_summary: "job description provided is empty",
    cosineWhenEmbedded: 0.7,
  });
  const result = runFullPipeline(r, j);
  assert.equal(result.band, "filtered", `low-quality JD must be filtered. ${result.notes}`);
});

test("under-experienced candidate on staff-level role lands at Explore or Filtered", () => {
  // mid_frontend (4 yrs) vs Staff role asking 8+ yrs
  const r = RESUMES.find((x) => x.label === "mid_frontend")!;
  const j = withDefaults({
    label: "staff_frontend",
    title: "Staff Frontend Engineer",
    description: "Lead the frontend architecture. 8+ years required. React, TypeScript.".repeat(2),
    role_function: "frontend",
    role_function_jd: "frontend",
    must_have_skills: ["React", "TypeScript", "Architecture"],
    tech_stack: ["react", "typescript"],
    jd_min_years: 8, jd_max_years: 14, jd_seniority_signal: "staff",
    cosineWhenEmbedded: 0.78,
  });
  const result = runFullPipeline(r, j);
  // 4 vs 8 → 4 yrs under → years_gap hard mismatch → filtered
  assert.equal(result.band, "filtered", `8+ yrs role for 4-yr candidate must be filtered. ${result.notes}`);
});

test("over-experienced candidate on junior role lands at Explore, not Filtered", () => {
  // senior_backend (6 yrs) vs Junior role
  const r = RESUMES.find((x) => x.label === "senior_backend")!;
  const j = withDefaults({
    label: "junior_backend",
    title: "Junior Backend Engineer",
    description: "Entry-level backend role. TypeScript, Postgres. 0-2 yrs.".repeat(3),
    role_function: "backend",
    role_function_jd: "backend",
    must_have_skills: ["TypeScript", "Postgres"],
    tech_stack: ["typescript", "postgres"],
    jd_min_years: 0, jd_max_years: 2, jd_seniority_signal: "junior",
    cosineWhenEmbedded: 0.66,
  });
  const result = runFullPipeline(r, j);
  // Over-qualified should NOT filter (matches still get to see it; might be in Explore).
  assert.notEqual(result.band, "filtered", `senior on junior role should not be hard-filtered. ${result.notes}`);
});

test("fleet rollup — ≥60% of direct-role-match pairs with parsed JD land in Priority", () => {
  const allResumes = RESUMES;
  const allJobs = [...jobsForBackend(), ...jobsForQa(), ...jobsForDataEng()];
  let pairs = 0;
  let priority = 0;
  const misses: string[] = [];
  for (const r of allResumes) {
    for (const j of allJobs) {
      if (!j.jd_parsed) continue; // only parsed JDs count for Priority
      const tgt = r.target_role_functions[0];
      if (tgt !== j.role_function) continue;
      pairs++;
      const result = runFullPipeline(r, j);
      if (result.band === "shortlist") priority++;
      else misses.push(`${r.label} × ${j.label}: ${result.notes}`);
    }
  }
  assert.ok(pairs > 0, "test setup must have direct matches with parsed JD");
  const rate = priority / pairs;
  if (rate < 0.60) {
    console.error("Priority misses:\n" + misses.join("\n"));
  }
  assert.ok(
    rate >= 0.60,
    `expected ≥60% of parsed direct matches in Priority; got ${(rate * 100).toFixed(0)}% (${priority}/${pairs})`,
  );
});
