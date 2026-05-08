// Phase J — JD-side structured extraction (improved).
//
// Run ONCE per job at ingest time. Cached on the row so all downstream
// scoring + Fit Card generation reads structured facts rather than regex'ing
// the description blob.
//
// What's new vs Phase G:
//   • role_function_jd extracted from the JD body (not inferred from title)
//   • responsibilities[] — top 3-5 bullets, powers Fit Cards + matcher
//   • qualifications_required vs qualifications_preferred split out from
//     skills (degrees, years-in-tech, certifications)
//   • tech_stack_explicit — verbatim tech named in the JD
//   • team_context — one sentence on the team if mentioned
//   • Tightened must-have rule: only when JD uses "required / must / minimum"
//   • Few-shot examples in the prompt to anchor the lite model

import { runWithRetry, SchemaType, type Schema, type RetryOptions } from "./gemini.js";

export const ROLE_FUNCTIONS = [
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "data_engineering",
  "data_science",
  "machine_learning",
  "ml_platform",
  "devops_sre",
  "security",
  "qa_test",
  "android",
  "ios",
  "embedded",
  "engineering_manager",
  "product",
  "design",
  "tpm",
  "data_analytics",
  "research",
  "other",
] as const;
export type RoleFunctionJd = (typeof ROLE_FUNCTIONS)[number];

export interface ParsedJD {
  must_have_skills: string[];
  nice_to_have_skills: string[];
  jd_min_years: number | null;
  jd_max_years: number | null;
  work_mode: "onsite" | "hybrid" | "remote" | null;
  jd_seniority_signal:
    | "intern" | "junior" | "mid" | "senior"
    | "staff" | "principal" | "lead" | "manager" | "director" | "vp"
    | null;
  /** ≤ 280 chars, what this role actually IS in plain English. Powers Fit Card header. */
  jd_summary: string;
  /** Ghost / boilerplate signals. */
  is_boilerplate: boolean;
  ghost_reasons: string[];

  // ── Phase J additions ─────────────────────────────────────────────────────
  /** Role function inferred from the JD body, not the title. */
  role_function_jd: RoleFunctionJd | null;
  /** Top 3-5 verbatim responsibilities (≤200 chars each). */
  responsibilities: string[];
  /** Required credentials (degrees, certifications, "5+ years in X"). */
  qualifications_required: string[];
  /** Preferred / nice-to-have credentials. */
  qualifications_preferred: string[];
  /** Tech named verbatim in JD (distinct from normalized must_have_skills). */
  tech_stack_explicit: string[];
  /** One sentence on the team / org context, if mentioned. */
  team_context: string | null;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    must_have_skills:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    nice_to_have_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    jd_min_years:        { type: SchemaType.NUMBER },
    jd_max_years:        { type: SchemaType.NUMBER },
    work_mode:           { type: SchemaType.STRING },
    jd_seniority_signal: { type: SchemaType.STRING },
    jd_summary:          { type: SchemaType.STRING },
    is_boilerplate:      { type: SchemaType.BOOLEAN },
    ghost_reasons:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    role_function_jd:    { type: SchemaType.STRING },
    responsibilities:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    qualifications_required:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    qualifications_preferred: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    tech_stack_explicit: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    team_context:        { type: SchemaType.STRING },
  },
  required: [
    "must_have_skills", "nice_to_have_skills",
    "jd_summary", "is_boilerplate", "ghost_reasons",
    "responsibilities", "qualifications_required", "qualifications_preferred",
    "tech_stack_explicit",
  ],
};

const PROMPT = `You are an expert technical recruiter parsing a job description for an
India-focused engineering platform. Extract structured facts. Be ruthlessly
literal — do NOT invent requirements that aren't in the text.

DEFINITIONS

must_have_skills: skills/tools the JD explicitly REQUIRES. Only include when
  the JD uses "required", "must have", "minimum", "at least N years of X",
  "expert in", "strong proficiency in", or lists the skill in a section
  titled Requirements / Qualifications / Must Have. Default to nice-to-have
  when uncertain. Canonical lower-case tokens (e.g. "react", "kafka",
  "postgres" — NOT "PostgreSQL 15+"). Max 12.

nice_to_have_skills: anything qualified by "preferred", "a plus", "bonus",
  "familiarity with", "exposure to", "experience with X is desirable",
  "nice to have", "added advantage", or listed in a Preferred Qualifications
  section. Canonical lower-case. Max 8.

jd_min_years / jd_max_years: integers (or one decimal). Read from "5-8 years",
  "5+ years", "minimum 3 years", "at least 4 years". null if not stated.

work_mode: 'onsite' | 'hybrid' | 'remote'. null if not clearly stated.

jd_seniority_signal: read title AND body. Use ONLY: intern, junior, mid,
  senior, staff, principal, lead, manager, director, vp. "Senior" in title →
  "senior". Multiple signals → use the highest. Map "SDE 1 / Engineer I" →
  junior; "SDE 2 / Engineer II" → mid; "SDE 3 / Engineer III" → senior;
  "SDE 4 / Senior Engineer II / Staff" → staff; "L5/L6/IC4/IC5" → senior to
  staff. Use your judgement when explicit.

jd_summary: ONE sentence ≤ 280 chars. Plain English. What this role actually
  is. No marketing copy, no "join our exciting team", no listicles.

is_boilerplate: true if the JD reads as a generic catch-all rather than a
  specific role (e.g. "Software Engineer - All Levels", obviously copy-pasted
  bullets, no concrete domain or stack).

ghost_reasons: short phrases for the boilerplate flag. Empty if not flagged.
  Examples: "no concrete tech stack", "title is a level range",
  "duplicate phrasing across sections".

role_function_jd: the function this role is in, inferred from the JD BODY
  (not just title). Use ONLY one of:
    backend, frontend, fullstack, mobile, android, ios, embedded,
    data_engineering, data_science, machine_learning, ml_platform,
    devops_sre, security, qa_test, engineering_manager, product, design,
    tpm, data_analytics, research, other.
  If the body says "build APIs / microservices / distributed systems" → backend.
  If it says "build pipelines, ETL, Spark, Airflow, Kafka, data warehouses" →
  data_engineering. If it says "train models, embeddings, LLMs, fine-tuning,
  RAG" → machine_learning. "ML infra / serving / feature stores" → ml_platform.
  When unclear, "other".

responsibilities: top 3 to 5 verbatim or near-verbatim bullets. Each ≤ 200
  chars. Concrete actions ("Build and maintain X", "Lead Y team", "Design Z").
  Skip generic filler ("be a team player").

qualifications_required: required credentials and experience claims that are
  NOT skills. e.g. "Bachelor's in CS or related field", "5+ years building
  distributed systems", "AWS Solutions Architect certification". Do NOT
  duplicate items that go in must_have_skills. Max 8.

qualifications_preferred: same rule but for preferred / nice-to-have
  credentials. Max 6.

tech_stack_explicit: tech, frameworks, services, databases named verbatim
  in the JD (preserve original casing for proper nouns: "PostgreSQL",
  "Kubernetes", "Apache Kafka", "Snowflake"). Distinct from must/nice — this
  is the raw vocabulary the JD uses. Max 25.

team_context: ONE sentence ≤ 200 chars on what team this role sits on, if
  mentioned. e.g. "Joins the Payments Platform team building card-on-file
  flows for 100M+ users." null if not stated.

CONSTRAINTS
- If the JD doesn't list a tech, do not invent one.
- If you can't find a number, return null. Do not guess.
- Skills (must/nice) are LOWERCASE single tokens or two-word phrases.
- Qualifications are full short phrases ("5+ years in distributed systems"),
  not lower-cased tokens.

EXAMPLES

Example A — tight JD:
  TITLE: Senior Backend Engineer, Payments
  BODY: We are looking for a Senior Backend Engineer to join the Payments
    Platform team. You will build and operate high-throughput card-on-file
    services in Go and Java. Required: 5+ years building distributed
    systems, expertise in Postgres and Kafka. Preferred: experience with
    PCI-DSS environments.
  → must_have_skills: ["go","java","postgres","kafka","distributed systems"]
  → nice_to_have_skills: []
  → qualifications_required: ["5+ years building distributed systems"]
  → qualifications_preferred: ["experience with PCI-DSS environments"]
  → role_function_jd: "backend"
  → jd_seniority_signal: "senior"
  → team_context: "Payments Platform team building high-throughput
     card-on-file services."
  → responsibilities: ["Build and operate high-throughput card-on-file
     services in Go and Java"]

Example B — sprawling JD:
  TITLE: Software Engineer - All Levels
  BODY: Generic 600-word boilerplate covering "ownership", "passion",
    "learning culture" with no concrete stack and no domain.
  → is_boilerplate: true
  → ghost_reasons: ["title is a level range","no concrete tech stack",
     "no concrete domain"]
  → role_function_jd: "other"

Return ONLY the JSON. No prose.`;

// ── Validation helpers ──────────────────────────────────────────────────────

const validSeniorities = new Set([
  "intern", "junior", "mid", "senior",
  "staff", "principal", "lead", "manager", "director", "vp",
]);
const validRoleFunctions = new Set<string>(ROLE_FUNCTIONS);

const lc = (s: unknown): string => String(s ?? "").trim().toLowerCase();

function dedupLowercase(arr: unknown[] | undefined, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of arr ?? []) {
    const k = lc(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

function dedupPreserveCase(arr: unknown[] | undefined, max: number, maxLen = 200): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of arr ?? []) {
    const s = String(t ?? "").trim().slice(0, maxLen);
    const k = s.toLowerCase();
    if (!s || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function num(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 50) return null;
  return Math.round(n * 10) / 10;
}

export async function parseJobDescription(
  input: { title: string; description: string; seniority_hint?: string | null },
  retryOpts?: RetryOptions,
): Promise<ParsedJD> {
  const prompt = `${PROMPT}

JOB TITLE: ${input.title}
SENIORITY HINT (from crawler): ${input.seniority_hint ?? "unknown"}
JOB DESCRIPTION:
${input.description.slice(0, 6000)}`;

  const text = await runWithRetry("light", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.05,
      },
    });
    return res.response.text();
  }, retryOpts);

  const raw = JSON.parse(text) as Partial<ParsedJD>;

  const seniority = lc(raw.jd_seniority_signal);
  const seniorityOut = validSeniorities.has(seniority)
    ? (seniority as ParsedJD["jd_seniority_signal"])
    : null;

  const workMode = lc(raw.work_mode);
  const workModeOut = workMode === "onsite" || workMode === "hybrid" || workMode === "remote"
    ? workMode
    : null;

  const roleFn = lc(raw.role_function_jd);
  const roleFnOut: RoleFunctionJd | null = validRoleFunctions.has(roleFn)
    ? (roleFn as RoleFunctionJd)
    : null;

  const teamCtxRaw = String(raw.team_context ?? "").trim();
  const teamCtxOut = teamCtxRaw.length > 0 && teamCtxRaw.length <= 240 ? teamCtxRaw : null;

  return {
    must_have_skills:    dedupLowercase(raw.must_have_skills, 12),
    nice_to_have_skills: dedupLowercase(raw.nice_to_have_skills, 8),
    jd_min_years:        num(raw.jd_min_years),
    jd_max_years:        num(raw.jd_max_years),
    work_mode:           workModeOut,
    jd_seniority_signal: seniorityOut,
    jd_summary:          (raw.jd_summary ?? "").slice(0, 280),
    is_boilerplate:      Boolean(raw.is_boilerplate),
    ghost_reasons:       dedupLowercase(raw.ghost_reasons, 5),

    role_function_jd:        roleFnOut,
    responsibilities:        dedupPreserveCase(raw.responsibilities, 5, 200),
    qualifications_required: dedupPreserveCase(raw.qualifications_required, 8, 200),
    qualifications_preferred: dedupPreserveCase(raw.qualifications_preferred, 6, 200),
    tech_stack_explicit:     dedupPreserveCase(raw.tech_stack_explicit, 25, 60),
    team_context:            teamCtxOut,
  };
}
