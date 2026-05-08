import type { RawJob, NormalizedJob, Seniority } from "@prodmatch/shared";
import { computeSignature } from "../lib/hash.js";

// ── Description cleaning ─────────────────────────────────────────────────────
//
// Several APIs (Greenhouse — used by Razorpay, Groww, PhonePe — and a few
// Workday tenants) return HTML in their `content` / `description` fields,
// often double-encoded (`&lt;p&gt;text&lt;/p&gt;`). When the parser sees
// raw markup as text, signal-to-noise drops and downstream extraction
// (skills, summary, responsibilities) suffers. Decoding entities and
// stripping tags also halves the payload, which matters when our parse
// truncation lands at 10 000 chars — the actual JD content needs to fit
// under that boundary, not the company-intro boilerplate.

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&rsquo;": "'", "&lsquo;": "'",
  "&rdquo;": "\"", "&ldquo;": "\"", "&mdash;": "—", "&ndash;": "–",
  "&hellip;": "…", "&copy;": "©", "&reg;": "®",
};

function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function cleanDescription(raw: string): string {
  if (!raw) return "";
  // Two passes — many feeds double-encode (`&amp;lt;` → `&lt;` → `<`).
  let s = decodeEntities(decodeEntities(raw));
  // Strip script/style blocks fully (their text content is noise).
  s = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Convert structural tags to newlines so we keep paragraph boundaries.
  s = s.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
       .replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Collapse whitespace; preserve single newlines as paragraph hints.
  s = s.replace(/[ \t\f\v]+/g, " ")
       .replace(/\n[ ]+/g, "\n")
       .replace(/\n{3,}/g, "\n\n")
       .trim();
  return s;
}

// ── Hub mapping ────────────────────────────────────────────────────────────────

const LOCATION_TO_HUB: Array<[RegExp, string]> = [
  [/bengaluru|bangalore|\bblr\b/i, "Bengaluru"],
  [/hyderabad|\bhyd\b/i, "Hyderabad"],
  [/\bpune\b/i, "Pune"],
  [/gurugram|gurgaon/i, "Gurugram"],
  [/\bnoida\b/i, "Noida"],
  [/\bdelhincr\b|delhi\s*ncr|\bncr\b|new delhi|\bdelhi\b/i, "Delhi NCR"],
  [/\bmumbai\b|bombay/i, "Mumbai"],
  [/\bchennai\b|madras/i, "Chennai"],
  [/remote.*india|india.*remote|work.from.home|wfh/i, "Remote-India"],
];

export function extractHubs(locationStr: string): string[] {
  const hubs = new Set<string>();
  for (const [re, hub] of LOCATION_TO_HUB) {
    if (re.test(locationStr)) hubs.add(hub);
  }
  // "India" with no city → Remote-India
  if (hubs.size === 0 && /\bindia\b/i.test(locationStr)) {
    hubs.add("Remote-India");
  }
  return [...hubs];
}

// ── Compensation ───────────────────────────────────────────────────────────────

export function extractLPA(text: string): { min: number | null; max: number | null } {
  const patterns: RegExp[] = [
    // "30-40 LPA", "30–40 lpa", "30 to 40 LPA"
    /(\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|l\.?p\.?a|lakhs?\s*per\s*annum|lacs?\s*per\s*annum)/i,
    // "₹30L - ₹40L"
    /₹\s*(\d+(?:\.\d+)?)\s*L\s*[-–]\s*₹\s*(\d+(?:\.\d+)?)\s*L/i,
    // "30 LPA" (single value)
    /(\d+(?:\.\d+)?)\s*(?:lpa|l\.?p\.?a|lakhs?\s*per\s*annum)/i,
    // "30 to 40 lakhs"
    /(\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const a = parseFloat(m[1]);
      const b = m[2] ? parseFloat(m[2]) : null;
      if (b) return { min: Math.min(a, b), max: Math.max(a, b) };
      return { min: a, max: a };
    }
  }
  return { min: null, max: null };
}

// ── Experience ─────────────────────────────────────────────────────────────────

export function extractExperienceYears(text: string): { min: number | null; max: number | null } {
  const patterns: RegExp[] = [
    /(\d+)\s*(?:[-–]|to)\s*(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(\d+)\+\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(?:minimum|at\s+least)\s+(\d+)\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
    /(\d+)\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const a = parseInt(m[1]);
      const b = m[2] ? parseInt(m[2]) : null;
      if (b) return { min: Math.min(a, b), max: Math.max(a, b) };
      return { min: a, max: null };
    }
  }
  return { min: null, max: null };
}

// ── Tech stack ─────────────────────────────────────────────────────────────────

const TECH_KEYWORDS: string[] = [
  // Languages
  "python", "java", "golang", "go", "rust", "typescript", "javascript",
  "c++", "c#", "kotlin", "swift", "scala", "ruby", "php", "r",
  // Web frameworks
  "react", "next.js", "nextjs", "vue", "angular", "svelte",
  "node.js", "nodejs", "express", "fastify", "nestjs",
  "django", "flask", "fastapi", "spring boot", "spring",
  // Mobile
  "android", "ios", "react native", "flutter",
  // Infra / cloud
  "aws", "gcp", "azure", "kubernetes", "k8s", "docker",
  "terraform", "helm", "ansible", "cloudformation",
  // Databases
  "postgresql", "postgres", "mysql", "mssql", "oracle db", "sqlite",
  "mongodb", "redis", "elasticsearch", "opensearch", "cassandra",
  "dynamodb", "bigquery", "snowflake", "redshift", "clickhouse",
  // Data engineering — Phase G expansion (was missing the modern Indian
  // stack: nearly every Razorpay/Swiggy/Flipkart/PhonePe DE JD names these,
  // and they're 80% of what Indian DE candidates list on their resumes.
  "databricks", "pyspark", "delta lake", "deltalake",
  "azure data factory", "adf", "adls", "synapse", "fabric",
  "data factory", "data lake",
  // Streaming / messaging
  "kafka", "kinesis", "pub/sub", "pubsub", "rabbitmq", "sqs", "event hubs",
  // Batch / ETL / orchestration
  "spark", "hadoop", "hive", "flink", "beam",
  "airflow", "dbt", "luigi", "dagster", "prefect",
  // ML / DS
  "pytorch", "tensorflow", "scikit-learn", "sklearn",
  "hugging face", "huggingface", "langchain", "langgraph", "llamaindex",
  "mlflow", "kubeflow", "ray", "vector db", "pinecone", "weaviate", "qdrant",
  "llm", "openai", "anthropic", "gemini", "rag",
  // Observability
  "datadog", "grafana", "prometheus", "splunk", "newrelic", "sentry", "opentelemetry",
  // Practices / tools
  "graphql", "grpc", "rest api", "microservices", "event-driven",
  "ci/cd", "jenkins", "github actions", "gitlab ci", "circleci",
  "git", "linux",
];

const TECH_PATTERN_CACHE: Map<string, RegExp> = new Map(
  TECH_KEYWORDS.map((t) => [t, new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")])
);

export function extractTechStack(text: string): string[] {
  return TECH_KEYWORDS.filter((t) => TECH_PATTERN_CACHE.get(t)!.test(text));
}

// ── posted_at sanitiser ────────────────────────────────────────────────────────
// Different sources emit wildly different formats. Postgres' timestamptz only
// accepts ISO-ish strings, so anything we can't confidently parse becomes null
// rather than poisoning the column. Concrete failures we've seen in production:
//   - Workday: "Posted Today" / "Posted Yesterday" / "Posted N Days Ago" /
//              "Posted 30+ Days Ago"  (NVIDIA, Salesforce)
//   - CRED: Unix epoch milliseconds as a string ("1759213235044")
//   - Sane sources: ISO 8601 strings (already valid)

const WORKDAY_DAYS_AGO = /^\s*posted\s+(\d+)\s*\+?\s*days?\s+ago\s*$/i;
const WORKDAY_TODAY = /^\s*posted\s+today\s*$/i;
const WORKDAY_YESTERDAY = /^\s*posted\s+yesterday\s*$/i;

export function parsePostedAt(input: string | number | null | undefined): string | null {
  if (input == null) return null;

  // Numeric input: epoch seconds or ms
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input <= 0) return null;
    const ms = input < 1e12 ? input * 1000 : input;  // <2001-09 means seconds
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const s = input.trim();
  if (!s) return null;

  // All-digits string → epoch (seconds or ms)
  if (/^\d{10,13}$/.test(s)) {
    return parsePostedAt(parseInt(s, 10));
  }

  // Workday relative phrases
  if (WORKDAY_TODAY.test(s)) return new Date().toISOString();
  if (WORKDAY_YESTERDAY.test(s)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  const m = s.match(WORKDAY_DAYS_AGO);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 0 && n < 3650) {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    }
    return null;
  }

  // ISO 8601 / RFC-2822 / anything Date can parse
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
    return parsed.toISOString();
  }

  return null;
}

// ── Seniority ──────────────────────────────────────────────────────────────────

export function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/intern|internship|apprentice/.test(t)) return "intern";
  if (/\bjunior\b|associate\b/.test(t)) return "junior";
  if (/\bstaff\b/.test(t)) return "staff";
  if (/\bprincipal\b/.test(t)) return "principal";
  if (/\bvp\b|vice\s+president/.test(t)) return "vp";
  if (/director/.test(t)) return "director";
  if (/manager/.test(t)) return "manager";
  if (/\blead\b/.test(t)) return "lead";
  if (/\bsenior\b|\bsr\.?\s/.test(t)) return "senior";
  return "mid";
}

// ── Main normalizer ────────────────────────────────────────────────────────────

export function normalizeJob(raw: RawJob, companyId: string): NormalizedJob {
  // Decode HTML entities + strip tags ONCE here. Every downstream step
  // (LPA / years / tech extraction, the LLM parser, embeddings) sees
  // clean plain text instead of `&lt;p&gt;…&lt;/p&gt;`.
  const cleanedDescription = cleanDescription(raw.description ?? "");

  const hubs = extractHubs(raw.location_raw);
  const { min: compMin, max: compMax } = extractLPA(cleanedDescription);
  const { min: expMin, max: expMax } = extractExperienceYears(cleanedDescription);
  const techStack = extractTechStack(`${raw.title} ${cleanedDescription}`);
  const seniority = inferSeniority(raw.title);
  const signature = computeSignature(raw.title, raw.location_raw, cleanedDescription);

  // Sanitise apply_url: must look URL-ish and not be empty.
  const applyUrl =
    raw.apply_url && /^https?:\/\//i.test(raw.apply_url) && raw.apply_url.length > 8
      ? raw.apply_url
      : null;

  return {
    company_id: companyId,
    external_id: raw.external_id,
    signature,
    title: raw.title.trim(),
    description: cleanedDescription,
    location: raw.location_raw,
    apply_url: applyUrl,
    hubs,
    min_experience_years: expMin,
    max_experience_years: expMax,
    comp_lpa_min: compMin,
    comp_lpa_max: compMax,
    tech_stack: techStack,
    seniority,
    posted_at: parsePostedAt(raw.posted_at),
    raw: raw.raw,
  };
}
