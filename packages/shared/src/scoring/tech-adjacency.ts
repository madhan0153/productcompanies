// Sprint 6 — Tech adjacency taxonomy.
//
// Captures the "close cousins" relationships between tech skills so the
// matching engine can give partial credit for adjacent expertise, instead of
// the binary set-intersection we used before. The TECH_DOMAINS grouping in
// score.ts handles intra-domain adjacency already (React ↔ Vue ↔ Angular are
// all `frontend_fw`); this module adds explicit CROSS-domain adjacency
// (React Native → React, Spark → Kafka for streaming, etc.) plus an analyser
// that breaks must-have coverage into direct / adjacent / missing buckets.
//
// Used by:
//   - apps/web/lib/matching/score.ts (analyzeTechCoverage)
//   - apps/web/lib/matching/hard-caps.ts (zero-direct + zero-adjacent → cap)
//   - UI (surfaces "Adjacent skills you have" in fit cards eventually)
//
// Design rules:
//   • Adjacency is SYMMETRIC: if A→[B], then we register B→[A] at construct.
//   • Adjacency does NOT replace domain matching — it ADDS partial credit.
//   • Skill normalisation matches the engine's normSkill: lowercase,
//     non-[a-z0-9#+.] stripped. Keep keys here in that normalised form.

function normTech(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9#+.]/g, "").trim();
}

// Raw adjacency edges. Each line: "A relates to B" (and vice-versa thanks to
// the symmetric-closure step below). Curated for the 18 product-co stack —
// not exhaustive across all tech.
const RAW_ADJACENCY: Array<[string, string]> = [
  // ── Frontend ↔ mobile ──
  ["react",        "reactnative"],
  ["javascript",   "typescript"],
  ["vue",          "nuxt"],
  ["react",        "nextjs"],
  ["react",        "remix"],
  ["svelte",       "sveltekit"],

  // ── Backend frameworks ↔ languages ──
  ["nodejs",       "express"],
  ["nodejs",       "nestjs"],
  ["nodejs",       "fastify"],
  ["python",       "django"],
  ["python",       "flask"],
  ["python",       "fastapi"],
  ["java",         "spring"],
  ["java",         "springboot"],
  ["kotlin",       "spring"],
  ["go",           "gin"],
  ["go",           "fiber"],
  ["csharp",       "dotnet"],
  ["ruby",         "rails"],
  ["php",          "laravel"],

  // ── Data engineering — close cousins ──
  ["spark",        "pyspark"],
  ["spark",        "databricks"],
  ["pyspark",      "databricks"],
  ["kafka",        "kinesis"],
  ["kafka",        "rabbitmq"],
  ["kafka",        "pubsub"],
  ["airflow",      "dagster"],
  ["airflow",      "prefect"],
  ["dbt",          "snowflake"],
  ["snowflake",    "bigquery"],
  ["snowflake",    "redshift"],
  ["postgresql",   "mysql"],
  ["mongodb",      "dynamodb"],
  ["redis",        "memcached"],
  ["elasticsearch", "opensearch"],

  // ── Cloud (multicloud experience usually transfers) ──
  ["aws",          "gcp"],
  ["aws",          "azure"],
  ["gcp",          "azure"],
  ["lambda",       "cloudrun"],
  ["s3",           "gcs"],
  ["ec2",          "compute"],

  // ── DevOps / infra ──
  ["docker",       "kubernetes"],
  ["kubernetes",   "helm"],
  ["terraform",    "pulumi"],
  ["terraform",    "ansible"],
  ["jenkins",      "githubactions"],
  ["jenkins",      "gitlabci"],
  ["jenkins",      "circleci"],

  // ── Observability ──
  ["datadog",      "newrelic"],
  ["prometheus",   "grafana"],
  ["sentry",       "datadog"],

  // ── ML / AI ──
  ["pytorch",      "tensorflow"],
  ["sklearn",      "xgboost"],
  ["sklearn",      "lightgbm"],
  ["huggingface",  "langchain"],
  ["langchain",    "llamaindex"],

  // ── Testing ──
  ["selenium",     "playwright"],
  ["selenium",     "cypress"],
  ["pytest",       "unittest"],
  ["junit",        "testng"],
  ["jest",         "vitest"],
  ["jest",         "mocha"],
  ["postman",      "restassured"],

  // ── Mobile ──
  ["android",      "kotlin"],
  ["ios",          "swift"],
  ["reactnative",  "flutter"],
];

// Build symmetric adjacency map at module load.
const ADJACENCY: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    const k = normTech(a);
    const v = normTech(b);
    if (!k || !v || k === v) return;
    let bucket = m.get(k);
    if (!bucket) { bucket = new Set<string>(); m.set(k, bucket); }
    bucket.add(v);
  };
  for (const [a, b] of RAW_ADJACENCY) { add(a, b); add(b, a); }
  return m;
})();

/** True iff `a` and `b` are listed as adjacent. Symmetric. Case-insensitive. */
export function isAdjacent(a: string, b: string): boolean {
  const ka = normTech(a);
  const kb = normTech(b);
  if (!ka || !kb) return false;
  if (ka === kb) return false; // exact match is "direct", not adjacent
  return ADJACENCY.get(ka)?.has(kb) ?? false;
}

/** Returns all techs adjacent to `skill`. */
export function adjacentTo(skill: string): string[] {
  const k = normTech(skill);
  const set = ADJACENCY.get(k);
  return set ? [...set] : [];
}

export interface TechCoverage {
  /** Must-have skills the candidate matches DIRECTLY (exact or same-domain). */
  direct: string[];
  /** Must-have skills covered ONLY by adjacency (close cousins, partial credit). */
  adjacent: Array<{ jdSkill: string; via: string }>;
  /** Must-have skills with no direct and no adjacent coverage. */
  missing: string[];
  /** True when the candidate has zero direct hits across all must-haves. */
  noDirect: boolean;
  /** True when ALL must-haves are missing (no direct AND no adjacent). */
  noCoverage: boolean;
}

/**
 * Analyse must-have skill coverage given the candidate's resume tech stack.
 * Pure function — feed it pre-normalised arrays.
 *
 * `directMatcher` is supplied by the caller so the analyser can use the
 * caller's own domain-matching logic (which knows about TECH_DOMAINS in
 * score.ts) without forcing this module to duplicate that logic.
 */
export function analyzeTechCoverage(
  resumeSkills: string[],
  mustHaves: string[],
  directMatcher: (resumeSkills: string[], jdSkill: string) => boolean,
): TechCoverage {
  const direct: string[] = [];
  const adjacent: Array<{ jdSkill: string; via: string }> = [];
  const missing: string[] = [];

  for (const jdSkill of mustHaves) {
    if (directMatcher(resumeSkills, jdSkill)) {
      direct.push(jdSkill);
      continue;
    }
    // Check adjacency: any resume skill adjacent to the JD skill?
    let bridge: string | null = null;
    for (const rs of resumeSkills) {
      if (isAdjacent(rs, jdSkill)) { bridge = rs; break; }
    }
    if (bridge) {
      adjacent.push({ jdSkill, via: bridge });
    } else {
      missing.push(jdSkill);
    }
  }

  return {
    direct,
    adjacent,
    missing,
    noDirect: direct.length === 0,
    noCoverage: direct.length === 0 && adjacent.length === 0,
  };
}
