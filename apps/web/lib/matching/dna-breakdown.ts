// Sprint 1 — Item 2.
//
// Turns the opaque `product_dna_score` integer into a 4-axis breakdown the
// user can actually audit. Deterministic — same parsed resume always
// produces the same axes — and computed without an LLM call, so the
// dashboard tooltip can show "+22 product-co tenure, +14 modern stack" with
// no quota cost and no inference latency.
//
// Axes mirror the weights the resume-parse prompt told Gemini to use:
//   product_co_tenure   35   % of years at product companies
//   scale_impact        25   evidence of building user-facing products at scale
//   modern_stack        20   tech-stack modernity overlap
//   ownership_signals   20   leadership / ownership language in bullets
//
// The sum is the new `product_dna_score`. We compute it here so the per-axis
// reasoning is grounded in the same data, instead of asking Gemini twice.

import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

// Phase R2 follow-up — `product_co_tenure` removed.
// Where a candidate has worked is NOT a fair criterion for readiness; many
// strong engineers come from services backgrounds with deeper hands-on
// breadth than typical product-co peers. Skills + ownership + scale of work
// are what actually predict product-co success, so the 3 remaining axes
// carry the full 100. Weights redistributed to emphasise skill signal.
export type DnaAxis =
  | "modern_stack"
  | "scale_impact"
  | "ownership_signals";

export interface DnaAxisScore {
  axis: DnaAxis;
  label: string;
  score: number;   // 0..weight
  weight: number;  // max points
  hint: string;    // ≤140 chars — what was measured and why this score
}

export interface DnaBreakdown {
  total: number;            // 0..100 (sum of axes)
  axes: DnaAxisScore[];
}

const WEIGHTS: Record<DnaAxis, number> = {
  modern_stack:      40,  // skills matter most — was 20
  scale_impact:      35,  // demonstrated impact — was 25
  ownership_signals: 25,  // initiative language    — was 20
  // product_co_tenure was 35 — removed entirely.
};

// Curated modern-stack canonicals. Anything else still counts toward the
// resume's tech_stack length, but only these advance the modern_stack axis.
// Kept compact on purpose — adding niche items dilutes the signal.
const MODERN_STACK = new Set([
  // Languages
  "go", "golang", "rust", "typescript", "kotlin", "swift", "elixir",
  // Backend frameworks
  "fastapi", "nestjs", "spring boot", "graphql", "grpc",
  // Frontend
  "react", "next.js", "nextjs", "vue", "svelte", "remix",
  // Cloud & infra
  "kubernetes", "k8s", "docker", "terraform", "helm",
  "aws", "gcp", "azure", "lambda", "eks", "gke", "cloudrun",
  // Data + ML
  "kafka", "spark", "airflow", "dbt", "snowflake", "bigquery", "databricks",
  "pytorch", "tensorflow", "langchain", "huggingface", "llm",
  // Observability + reliability
  "prometheus", "grafana", "datadog", "opentelemetry",
  // Mobile-modern
  "flutter", "swiftui", "jetpack compose",
]);

const OWNERSHIP_VERBS = new Set([
  "led", "owned", "architected", "designed", "drove", "spearheaded",
  "launched", "shipped", "delivered", "scaled", "founded", "built",
  "mentored", "managed", "orchestrated", "established", "introduced",
]);

const SCALE_PATTERNS: RegExp[] = [
  // "1M users", "500k DAU", "10M+ requests", "billion-scale"
  /\b\d[\d,.]*\s*(m|k|million|billion|thousand)\+?\s*(users?|customers?|requests?|transactions?|qps|rps|dau|mau|events?|orders?)\b/i,
  // "p99 < 200ms", "sub-100ms latency"
  /\b(p\d{2}|p99|p95)\s*[<≤]?\s*\d+\s*ms\b/i,
  /\bsub[-\s]?\d+\s*ms\b/i,
  // "$5M ARR", "₹50Cr revenue"
  /[\$₹]\s*\d[\d,.]*\s*(m|cr|crore|million|billion|bn)\b/i,
  // "team of 12", "led a team of 8"
  /\bteam\s+of\s+\d+\b/i,
  // "10x faster", "3x throughput"
  /\b\d+x\s+(faster|throughput|improvement|growth)\b/i,
  // "reduced X by N%"
  /\b(reduced|cut|dropped|saved)\b[^.\n]{0,40}\bby\s+\d+(?:\.\d+)?\s*%/i,
];

function normTech(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreScaleImpact(resume: ParsedResume): DnaAxisScore {
  const weight = WEIGHTS.scale_impact;
  const bullets: string[] = [
    ...(resume.products_built ?? []),
    resume.summary ?? "",
    ...(resume.companies ?? []).map((c) => c.role ?? ""),
  ].filter((s) => s && s.length > 4);

  if (bullets.length === 0) {
    return {
      axis: "scale_impact", weight, score: 0,
      label: "Scale & impact",
      hint: "No bullet-style impact text found in resume.",
    };
  }

  let hits = 0;
  for (const line of bullets) {
    if (SCALE_PATTERNS.some((re) => re.test(line))) hits++;
  }
  const fraction = hits / bullets.length;
  // ~40% of bullets carrying a scale signal is already very strong; saturate
  // there so the axis doesn't reward bullet inflation.
  const curved = Math.min(1, fraction / 0.4);
  const score = Math.round(curved * weight);

  return {
    axis: "scale_impact", weight, score,
    label: "Scale & impact",
    hint: hits === 0
      ? "Add scale signals to your bullets: user counts, latency targets, revenue, throughput multipliers."
      : `${hits} of ${bullets.length} bullets carry a concrete scale or impact metric.`,
  };
}

function scoreModernStack(resume: ParsedResume): DnaAxisScore {
  const weight = WEIGHTS.modern_stack;
  const stack = (resume.tech_stack ?? []).map(normTech);
  if (stack.length === 0) {
    return {
      axis: "modern_stack", weight, score: 0,
      label: "Modern stack",
      hint: "No tech stack on resume.",
    };
  }
  const modernHits = stack.filter((t) => MODERN_STACK.has(t));
  // Diminishing returns: 8 modern items = full marks, 4 = ~75%, 0 = 0.
  const curved = Math.min(1, modernHits.length / 8);
  const score = Math.round(curved * weight);

  return {
    axis: "modern_stack", weight, score,
    label: "Modern stack",
    hint: modernHits.length === 0
      ? "Resume tech list doesn't overlap the modern-stack canon (Go/Rust/K8s/React/Spark/PyTorch/...)."
      : `Hits ${modernHits.length} modern-stack canon items: ${modernHits.slice(0, 5).join(", ")}${modernHits.length > 5 ? "…" : ""}.`,
  };
}

function scoreOwnershipSignals(resume: ParsedResume): DnaAxisScore {
  const weight = WEIGHTS.ownership_signals;
  const bullets: string[] = [
    ...(resume.products_built ?? []),
    resume.summary ?? "",
  ].filter((s) => s && s.length > 4);

  if (bullets.length === 0) {
    return {
      axis: "ownership_signals", weight, score: 0,
      label: "Ownership signals",
      hint: "No bullet text found to scan for ownership verbs.",
    };
  }

  let hits = 0;
  for (const line of bullets) {
    const first = line.toLowerCase().match(/^[a-z]+/);
    if (first && OWNERSHIP_VERBS.has(first[0])) hits++;
  }
  const fraction = hits / bullets.length;
  // ~50% of bullets opening with an ownership verb saturates.
  const curved = Math.min(1, fraction / 0.5);
  const score = Math.round(curved * weight);

  return {
    axis: "ownership_signals", weight, score,
    label: "Ownership signals",
    hint: hits === 0
      ? "Rewrite bullets to lead with ownership verbs: led, owned, shipped, architected, drove."
      : `${hits} of ${bullets.length} bullets open with an ownership verb.`,
  };
}

export function computeDnaBreakdown(resume: ParsedResume): DnaBreakdown {
  // 3 axes, weights 40/35/25 = 100. Skills + impact + ownership.
  // No "where you worked" signal — services-background engineers get a
  // fair shot purely on what they've actually built.
  const axes = [
    scoreModernStack(resume),
    scoreScaleImpact(resume),
    scoreOwnershipSignals(resume),
  ];
  const total = axes.reduce((s, a) => s + a.score, 0);
  return { total: Math.min(100, total), axes };
}
