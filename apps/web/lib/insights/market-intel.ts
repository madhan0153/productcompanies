// Sprint 1 — Item 1.
//
// Replaces the dashboard's hardcoded "personalizedMarketSignals" with real
// counts + real week-over-week trend from the live catalog. No fabricated
// numbers. Same surface, same shape; the data source is now the jobs table.

import { inferRoleFunctionFromTitle } from "@/lib/matching/score";

export type MarketJobLite = {
  title: string | null;
  tech_stack: string[] | null;
  role_function: string | null;
  created_at: string;
};

export type MarketSignal = {
  key: string;             // role-function key (backend, frontend, ml_ai, …)
  label: string;           // human label rendered on the dashboard
  /** 0-100 — share of the displayed buckets this one represents. */
  demand: number;
  /** Signed integer percent, "+12%" or "-4%". null when prior week was zero
   *  and we can't compute a ratio. */
  trend: string | null;
  /** Raw count this week — useful for the tooltip / aria-label. */
  thisWeek: number;
  /** Tailwind color class for the demand bar. */
  color: string;
};

export type MarketIntel = {
  roleLabel: string | null;
  signals: MarketSignal[];
};

// Mapping from canonical role_function → display label used on the dashboard.
const ROLE_LABELS: Record<string, string> = {
  backend:                "Backend & API engineers",
  frontend:               "Frontend / UI engineers",
  fullstack:              "Full-stack engineers",
  data_engineering:       "Data engineering",
  ml_ai:                  "ML / AI engineering",
  devops_platform:        "DevOps / platform / SRE",
  mobile:                 "Mobile (iOS / Android)",
  qa_sdet:                "QA / SDET",
  security:               "Security engineering",
  engineering_management: "Engineering management",
  product_management:     "Product management",
  design:                 "Product design",
  other:                  "Other engineering",
};

// Bucket → color (cycled across the top 4 rows). Stable so the bar gradients
// don't reshuffle between renders.
const ROLE_COLORS = [
  "bg-primary",
  "bg-violet-400",
  "bg-amber-400",
  "bg-sky-400",
] as const;

// Order in which we *prefer* to show role families when the user has no
// distinguishing tech stack — by total India market depth on the 18 cos.
const FALLBACK_ORDER = [
  "backend", "ml_ai", "data_engineering", "frontend", "fullstack",
  "devops_platform", "mobile", "qa_sdet", "security",
];

// Stack-based role inference for the "user's primary family" detection.
// Mirrors the deleted hardcoded function so a candidate's headline role is
// still highlighted, but every number on the screen now comes from real jobs.
function inferUserRoleFamily(techStack: string[]): string | null {
  if (!techStack.length) return null;
  const norm = techStack.map((t) => t.toLowerCase().replace(/[\s._-]/g, ""));
  const has = (keywords: string[]) =>
    norm.some((t) => keywords.some((k) => t.includes(k)));

  if (has(["tensorflow", "pytorch", "transformers", "huggingface", "llm", "langchain", "openai", "scikit", "mlflow", "genai", "rag"])) {
    return "ml_ai";
  }
  if (has(["spark", "airflow", "dbt", "databricks", "bigquery", "pyspark", "redshift", "snowflake", "kafka", "hive", "flink"])) {
    return "data_engineering";
  }
  if (has(["kubernetes", "k8s", "terraform", "helm", "prometheus", "grafana", "argo", "datadog"])) {
    return "devops_platform";
  }
  if (has(["android", "ios", "swift", "kotlin", "flutter", "reactnative"])) {
    return "mobile";
  }
  if (has(["react", "nextjs", "next", "vue", "angular", "svelte", "redux", "tailwind", "webpack", "vite"])) {
    return "frontend";
  }
  if (has(["java", "go", "golang", "python", "node", "kafka", "grpc", "postgres", "microservice", "spring", "fastapi", "django"])) {
    return "backend";
  }
  return null;
}

function bucketJob(job: MarketJobLite): string {
  if (job.role_function && job.role_function in ROLE_LABELS) return job.role_function;
  const inferred = inferRoleFunctionFromTitle(job.title ?? null);
  if (inferred && inferred in ROLE_LABELS) return inferred;
  return "other";
}

export function computeMarketSignals(
  allJobs: MarketJobLite[],
  thisWeekISO: string,                  // jobs.created_at >= this ⇒ "this week"
  priorWeekISO: string,                 // [priorWeekISO, thisWeekISO) ⇒ "prior week"
  userTechStack: string[] = [],
  showCount = 4,
): MarketIntel {
  const totalsByBucket    = new Map<string, number>();
  const thisWeekByBucket  = new Map<string, number>();
  const priorWeekByBucket = new Map<string, number>();

  for (const j of allJobs) {
    const b = bucketJob(j);
    totalsByBucket.set(b, (totalsByBucket.get(b) ?? 0) + 1);

    const created = j.created_at;
    if (!created) continue;
    if (created >= thisWeekISO) {
      thisWeekByBucket.set(b, (thisWeekByBucket.get(b) ?? 0) + 1);
    } else if (created >= priorWeekISO) {
      priorWeekByBucket.set(b, (priorWeekByBucket.get(b) ?? 0) + 1);
    }
  }

  // Decide ordering: user's primary family first, then top remaining by total.
  const userFamily = inferUserRoleFamily(userTechStack);
  const orderedKeys: string[] = [];
  if (userFamily && totalsByBucket.has(userFamily)) orderedKeys.push(userFamily);

  const byTotalDesc = [...totalsByBucket.entries()]
    .filter(([k]) => k !== "other" && k !== userFamily)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  for (const k of byTotalDesc) {
    if (!orderedKeys.includes(k)) orderedKeys.push(k);
    if (orderedKeys.length >= showCount) break;
  }

  // If we still have fewer than `showCount`, top up from the canonical fallback
  // list (catalog might be sparse in some buckets right after a fresh deploy).
  for (const k of FALLBACK_ORDER) {
    if (orderedKeys.length >= showCount) break;
    if (!orderedKeys.includes(k) && totalsByBucket.has(k)) orderedKeys.push(k);
  }

  const picked = orderedKeys.slice(0, showCount);
  if (picked.length === 0) return { roleLabel: null, signals: [] };

  // Normalise demand bars within the picked set so the biggest one = 100.
  const maxTotal = Math.max(1, ...picked.map((k) => totalsByBucket.get(k) ?? 0));

  const signals: MarketSignal[] = picked.map((key, i) => {
    const tw = thisWeekByBucket.get(key)  ?? 0;
    const pw = priorWeekByBucket.get(key) ?? 0;
    let trend: string | null;
    if (pw === 0 && tw === 0)      trend = null;
    else if (pw === 0)             trend = `+${tw} new`;       // baseline didn't exist — show absolute
    else {
      const pct = Math.round(((tw - pw) / pw) * 100);
      trend = `${pct >= 0 ? "+" : ""}${pct}%`;
    }
    return {
      key,
      label: ROLE_LABELS[key] ?? key,
      demand: Math.round(((totalsByBucket.get(key) ?? 0) / maxTotal) * 100),
      trend,
      thisWeek: tw,
      color: ROLE_COLORS[i % ROLE_COLORS.length],
    };
  });

  const roleLabel = userFamily
    ? `${ROLE_LABELS[userFamily]} · live demand`
    : "India product-company hiring · live";

  return { roleLabel, signals };
}
