// Resume diagnosis prompt (Step 1 of the Resume Intelligence pipeline).
//
// Reads the candidate's parsed resume + raw text + role function + market
// keywords, returns a structured weakness report. NO rewriting happens here
// — that's Step 2 (bullet-rewrite.ts). Separating diagnosis from rewriting
// keeps each prompt small, JSON-schema-enforced, and individually retryable.
//
// Authenticity rule (repeated in the prompt body): the model may flag
// bullets but must never propose new facts. It quotes originals verbatim
// so the rewrite step can match them.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";

export type WeaknessKind =
  | "no_metric"
  | "weak_verb"
  | "vague_scope"
  | "passive_voice"
  | "tense_drift"
  | "keyword_gap"
  | "redundancy";

export type AtsRiskSeverity = 1 | 2 | 3;

export interface ResumeDiagnosis {
  /** Letter grade from a recruiter perspective. */
  overall_grade: "A" | "B" | "C" | "D";
  /** Short one-liner the UI surfaces above the per-bullet list. */
  headline: string;
  /** ATS / formatting risks (header hygiene, sectioning, density). */
  ats_risks: Array<{
    severity: AtsRiskSeverity;
    issue: string;        // ≤ 110 chars
    where: string;        // ≤ 60 chars — section/area pointer
  }>;
  /** Bullets weak enough to be worth a rewrite. Max ~12. */
  weak_bullets: Array<{
    section: "summary" | "experience" | "projects";
    /** When section='experience' this is the company name from the resume. */
    company: string | null;
    /** Index of the bullet WITHIN its parent list. The rewrite step uses
     *  (section, company, bullet_index) to patch back into the resume. */
    bullet_index: number;
    /** EXACT quote from the source so we can diff. ≤ 280 chars. */
    original: string;
    weakness: WeaknessKind;
    severity: AtsRiskSeverity;
  }>;
  /** Keywords the candidate's resume under-emphasises for their target role. */
  missing_keywords: Array<{
    keyword: string;
    presence: "absent" | "weak";
    rationale: string;     // ≤ 130 chars
  }>;
  /** Plain-language recruiter concerns. 1-5 bullets, each ≤ 140 chars. */
  recruiter_concerns: string[];
}

const WEAKNESS_VALUES: WeaknessKind[] = [
  "no_metric", "weak_verb", "vague_scope", "passive_voice",
  "tense_drift", "keyword_gap", "redundancy",
];

// The Gemini SDK's TS types for STRING+enum are awkwardly typed (require a
// `format` field) and other prompt files don't use enum constraints. We
// inline the valid values into the prompt instead — same behaviour, cleaner
// schema. Runtime sanitisation in this file clamps to the type union.
void WEAKNESS_VALUES;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overall_grade: { type: SchemaType.STRING },
    headline:      { type: SchemaType.STRING },
    ats_risks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: { type: SchemaType.NUMBER },
          issue:    { type: SchemaType.STRING },
          where:    { type: SchemaType.STRING },
        },
        required: ["severity", "issue", "where"],
      },
    },
    weak_bullets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          section:      { type: SchemaType.STRING },
          company:      { type: SchemaType.STRING, nullable: true },
          bullet_index: { type: SchemaType.NUMBER },
          original:     { type: SchemaType.STRING },
          weakness:     { type: SchemaType.STRING },
          severity:     { type: SchemaType.NUMBER },
        },
        required: ["section", "bullet_index", "original", "weakness", "severity"],
      },
    },
    missing_keywords: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          keyword:   { type: SchemaType.STRING },
          presence:  { type: SchemaType.STRING },
          rationale: { type: SchemaType.STRING },
        },
        required: ["keyword", "presence", "rationale"],
      },
    },
    recruiter_concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "overall_grade", "headline", "ats_risks", "weak_bullets",
    "missing_keywords", "recruiter_concerns",
  ],
};

export interface DiagnoseInput {
  resume: ParsedResume;
  /** Raw resume text (extracted from PDF). Used for verbatim quoting. */
  resume_text: string;
  /** Candidate's primary role function (canonical). */
  role_function: string | null;
  /** Up to 30 keywords representing demand from the user's shortlist OR
   *  the JD's must-haves (Capability B). Drives the keyword_gap signal. */
  market_keywords: string[];
  /** Capability B: structured JD data when diagnosing for a specific job. */
  jd_context?: {
    title: string;
    must_have_skills: string[];
    nice_to_have_skills: string[];
    seniority: string | null;
  };
}

const SYSTEM = `You are a senior ATS-engineering specialist and product-company recruiter.
You audit Indian engineers' resumes targeting roles at top product companies
(Google, Microsoft, Meta, Amazon, Apple, Atlassian, Nvidia, Oracle, Salesforce,
SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart).

CRITICAL RULES:
1. NEVER fabricate facts. NEVER propose rewrites here. NEVER suggest text the
   candidate could add. This step is DIAGNOSIS ONLY.
2. EVERY 'original' field MUST quote the source resume bullet/line verbatim,
   matching exactly — the next pipeline stage uses this to diff and patch.
3. If you see no weak bullets, return an empty array. Quality over quantity:
   surface at most 12 issues, only the highest-impact wins.
4. Be neutral and constructive. NEVER frame the candidate's background
   (services / product / mixed) as a deficit.
5. Recruiter_concerns should be plain English a non-technical hiring
   manager would understand. No jargon.

VALID FIELD VALUES — use ONLY these strings:
  overall_grade:  "A" | "B" | "C" | "D"
  section:        "summary" | "experience" | "projects"
  weakness:       "no_metric" | "weak_verb" | "vague_scope" | "passive_voice"
                  | "tense_drift" | "keyword_gap" | "redundancy"
  presence:       "absent" | "weak"
  severity:       1 (minor) | 2 (moderate) | 3 (major)`;

function buildUserPrompt(input: DiagnoseInput): string {
  const roleLine = input.role_function
    ? `Target role function: ${input.role_function}`
    : "Target role function: (not declared — infer from resume)";

  const keywordsLine = input.market_keywords.length > 0
    ? `Market keywords for this role (in demand at product companies):\n  ${input.market_keywords.join(", ")}`
    : "Market keywords: (none provided — flag domain-generic keyword gaps only)";

  const jdLine = input.jd_context
    ? `\nJD CONTEXT — diagnosis should consider this specific role:
  Title:              ${input.jd_context.title}
  Must-have skills:   ${input.jd_context.must_have_skills.join(", ") || "(none parsed)"}
  Nice-to-have:       ${input.jd_context.nice_to_have_skills.join(", ") || "(none parsed)"}
  Seniority signal:   ${input.jd_context.seniority ?? "(none)"}`
    : "";

  return `${roleLine}
${keywordsLine}${jdLine}

PARSED RESUME (structural snapshot for indexing):
${JSON.stringify({
    name: input.resume.name,
    current_role: input.resume.current_role,
    summary: input.resume.summary,
    products_built: input.resume.products_built,
    companies: input.resume.companies,
    tech_stack: input.resume.tech_stack,
    education: input.resume.education,
  }, null, 2)}

RAW RESUME TEXT (use this for verbatim 'original' quotes — bullets in the JSON
above may be summarised. Always quote from this raw text):
---
${input.resume_text.slice(0, 14000)}
---

Now produce a ResumeDiagnosis JSON conforming to the schema. Remember:
diagnosis only — no rewrites, no invention, no negative bias about the
candidate's career path.`;
}

export interface DiagnoseResult {
  ok: true;
  diagnosis: ResumeDiagnosis;
  /** Approximate token usage (for telemetry). */
  tokens_in?: number;
  tokens_out?: number;
  /** ms wall-clock. */
  latency_ms: number;
}

export async function diagnoseResume(input: DiagnoseInput): Promise<DiagnoseResult> {
  const started = Date.now();
  const prompt = buildUserPrompt(input);

  const text = await runWithRetry("heavy", async (model) => {
    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    return resp.response.text();
  }, { operation: "resume_diagnosis" });

  const diagnosis = JSON.parse(text) as ResumeDiagnosis;

  // Sanitise: clamp arrays, ensure verbatim original quotes are non-empty.
  diagnosis.weak_bullets = (diagnosis.weak_bullets ?? [])
    .filter((b) => b.original && b.original.trim().length > 4)
    .slice(0, 12);
  diagnosis.ats_risks = (diagnosis.ats_risks ?? []).slice(0, 8);
  diagnosis.missing_keywords = (diagnosis.missing_keywords ?? []).slice(0, 12);
  diagnosis.recruiter_concerns = (diagnosis.recruiter_concerns ?? []).slice(0, 5);

  return {
    ok: true,
    diagnosis,
    latency_ms: Date.now() - started,
  };
}
