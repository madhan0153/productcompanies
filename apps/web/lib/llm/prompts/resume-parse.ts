import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { extractPdfText } from "@/lib/resume/pdf-text";
import { logEvent } from "@/lib/observability/log";
import { sanitizeParsedResume } from "@/lib/resume/parsed-sanitizer";
import { parseJsonObject } from "@prodmatch/shared";

export interface ParsedResume {
  name: string;
  current_role: string;
  role_function: string;         // canonical function: qa_sdet | backend | frontend | ...
  target_role_functions: string[]; // up to 3 functions they're targeting
  total_years_experience: number;
  tech_stack: string[];
  soft_skills: string[];
  products_built: string[];
  companies: Array<{
    name: string;
    role: string;
    years: number;
    is_product_company: boolean;
    /** ISO-ish: "YYYY-MM" or "YYYY". Optional — older parses omit it. */
    start_date?: string;
    /** "YYYY-MM", "YYYY", or "Present" for the current role. */
    end_date?: string;
    /** One-line role context (team / scope), product-company register. */
    summary?: string;
    /** 2–5 achievement bullets, rewritten in product-company language. */
    highlights?: string[];
  }>;
  /** Rich project detail for the editor. Superset of products_built (names). */
  projects?: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    tech?: string[];
  }>;
  /** Certifications with issuer + date when present on the resume. */
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string; // "YYYY" or "YYYY-MM"
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: number;
  }>;
  summary: string;
  product_dna_score: number;
  estimated_current_lpa?: number;
  preferred_hubs?: string[];
}

const ROLE_FUNCTION_VALUES = [
  "qa_sdet", "backend", "frontend", "fullstack",
  "data_engineering", "ml_ai", "devops_platform", "mobile",
  "engineering_management", "product_management", "design", "security", "other",
];

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name:                    { type: SchemaType.STRING },
    current_role:            { type: SchemaType.STRING },
    role_function:           { type: SchemaType.STRING },
    target_role_functions:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    total_years_experience:  { type: SchemaType.NUMBER },
    tech_stack:              { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    soft_skills:             { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    products_built:          { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    companies: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:               { type: SchemaType.STRING },
          role:               { type: SchemaType.STRING },
          years:              { type: SchemaType.NUMBER },
          is_product_company: { type: SchemaType.BOOLEAN },
          start_date:         { type: SchemaType.STRING },
          end_date:           { type: SchemaType.STRING },
          summary:            { type: SchemaType.STRING },
          highlights:         { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["name", "role", "years", "is_product_company", "start_date", "end_date", "summary", "highlights"],
      },
    },
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:        { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          highlights:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          tech:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["name", "description", "highlights", "tech"],
      },
    },
    certifications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:   { type: SchemaType.STRING },
          issuer: { type: SchemaType.STRING },
          date:   { type: SchemaType.STRING },
        },
        required: ["name"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          degree:      { type: SchemaType.STRING },
          institution: { type: SchemaType.STRING },
          year:        { type: SchemaType.NUMBER },
        },
        required: ["degree", "institution"],
      },
    },
    summary:               { type: SchemaType.STRING },
    product_dna_score:     { type: SchemaType.NUMBER },
    estimated_current_lpa: { type: SchemaType.NUMBER },
    preferred_hubs:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "name", "current_role", "role_function", "target_role_functions",
    "total_years_experience", "tech_stack", "soft_skills", "products_built",
    "companies", "education", "summary", "product_dna_score",
  ],
};

const INDIA_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India"];

const COMMON_INSTRUCTIONS = `For role_function: classify the candidate's PRIMARY engineering function based on their
most recent 3 years of work. Must be EXACTLY one of:
${ROLE_FUNCTION_VALUES.join(", ")}.
- qa_sdet: QA engineers, SDETs, test automation, quality leads
- backend: backend/API/server-side engineers
- frontend: UI/UX engineers, React/Vue/Angular specialists
- fullstack: engineers who own both frontend and backend
- data_engineering: data pipelines, ETL, Spark, Airflow, Kafka engineers
- ml_ai: ML engineers, data scientists, AI researchers
- devops_platform: DevOps, SRE, infrastructure, platform engineers
- mobile: iOS/Android/React Native/Flutter engineers
- engineering_management: EM, VP Engineering, Head of Engineering
- product_management: product managers, TPMs
- design: UX/UI designers
- security: security engineers, AppSec, pentesters
- other: anything that doesn't fit above

For target_role_functions: list up to 3 functions this candidate is TARGETING.
For most people this is the same as role_function. Include adjacent functions
only if their career history shows a clear pivot or stated intent.
Must use the same allowed values as role_function.

For product_dna_score (0–100), score based on:
- % of career spent at product/tech companies (not IT services/outsourcing): up to 35 points
- Evidence of building user-facing products at scale (millions of users, SaaS, B2C): up to 25 points
- Tech stack modernity (cloud-native, microservices, modern frameworks vs legacy): up to 20 points
- Leadership/ownership signals (led features, teams, launched products): up to 20 points

For preferred_hubs, infer from work history cities. Use only: ${INDIA_HUBS.join(", ")}.
If current company is a product company (Google, Meta, Razorpay, Zerodha, CRED, Groww, etc.), set is_product_company=true.
Estimate total_years_experience from work history dates.
Do NOT include PII in summary — only professional summary.
For estimated_current_lpa: estimate in LPA (lakhs per annum) based on role seniority, company tier, and years of experience in India market. Return null/omit if insufficient data.

Extraction discipline:
- Read the whole resume, including sidebars, two-column layouts, tables, headers/footers, and final sections.
- Never copy instructions, section labels, placeholders, or helper text into output fields.
- Never output text like "Translate bullets to product-co language", "rewrite", "not available", "N/A", or "not specified" in highlights, summaries, descriptions, or certifications.
- If a field is absent from the resume, use an empty string or empty array; do not fabricate.
- Preserve every explicit number, scale marker, date range, certification name, issuer, and project technology that appears in the resume.

For EACH company in "companies", fill these fields completely from the resume:
- start_date / end_date: the employment dates. Normalise to "YYYY-MM" (e.g. "2024-08") when month+year are present, or "YYYY" when only a year is present. Use "Present" for the end_date of the candidate's current role. Never leave these blank if the resume shows any dates.
- summary: a single concise line describing the team / product / scope of that role (no PII).
- highlights: 2–5 of the candidate's strongest achievement bullets for that role. REWRITE each bullet in crisp PRODUCT-COMPANY language, not IT-services language. Rules for rewriting:
  * Lead with the impact / outcome, then how. Quantify with real numbers from the resume (latency, scale, %, volume, cost) — never invent numbers.
  * Use strong ownership verbs (Built, Designed, Led, Shipped, Scaled, Owned) — avoid "Responsible for", "Worked on", "Involved in", "Assisted".
  * Emphasise systems built, ownership, scale, and measurable results over task lists or client/process language.
  * Keep each bullet one sentence, ≤ 240 characters. Do NOT fabricate facts not supported by the resume.
  * Translate services-style wording into product language: "worked on module" -> "Built/Owned the module"; "handled client requirements" -> "Shipped product requirements"; "support/maintenance" -> "Improved reliability/operations" only when the source supports it.

For "projects": extract EVERY project / product the candidate built (from a Projects section AND notable products built inside their jobs). For each project fill:
- name (required), description (one line of what it is / does), highlights (1–4 achievement bullets rewritten in the same product-company style as above), and tech (the concrete technologies/keywords used in that project).
- Project tech must include frameworks, languages, databases, cloud, tools, and domain keywords explicitly tied to that project when present.
- If the resume lists a project with only a name and tech, still create the project: use the name, the visible tech, and an empty description/highlights only when no description or bullet exists.
Also keep "products_built" as the list of project/product NAMES (for backward compatibility).

For "certifications": extract every certification, license, course credential, badge, or professional credential from sections named Certifications, Licenses, Courses, Achievements, Training, or Credentials. For each, fill name (required), issuer (the awarding body, e.g. "Microsoft", "AWS", "Coursera", "Udemy", "NPTEL"), and date ("YYYY" or "YYYY-MM") when shown. Return an empty array if the resume has none.`;

const PDF_PROMPT = `You are an expert resume parser for an India-focused engineering job platform.
Extract structured information from the provided resume PDF.

${COMMON_INSTRUCTIONS}`;

const TEXT_PROMPT = `You are an expert resume parser for an India-focused engineering job platform.
Extract structured information from the resume text provided below the marker.
Return ONLY a JSON object that matches the requested schema; no prose, no markdown.

${COMMON_INSTRUCTIONS}

=== RESUME TEXT BEGINS ===`;

/**
 * Parse a resume PDF into the ParsedResume schema.
 *
 *   1. Tries the multimodal Gemini path first (best quality — Gemini reads
 *      tables, columns, fonts, layout).
 *   2. On any failure (Gemini exhausted, no PDF-capable provider), extracts
 *      plain text from the PDF on the server and routes the text through
 *      any configured text-capable provider (Groq, OpenRouter, Mistral,
 *      etc.). Slightly lower quality, but keeps resume parse working when
 *      Gemini is dead.
 *
 * Input is the **base64 representation of the raw PDF bytes** — same shape
 * the rest of the app passes around. The fallback reconstructs the buffer
 * server-side to run text extraction.
 */
export async function parseResumePdf(pdfBase64: string): Promise<ParsedResume> {
  try {
    return await parseResumeMultimodal(pdfBase64);
  } catch (primaryErr) {
    // Multimodal failed — Gemini keys exhausted, or no PDF-capable provider.
    // Log a structured event WITHOUT the resume content, then try text path.
    logEvent("warn", "resume_pdf_multimodal_failed", {
      reason: errKind(primaryErr),
    });
    return await parseResumeFromPdfViaText(pdfBase64, primaryErr);
  }
}

/** Primary multimodal path — kept under the hood for tests + telemetry. */
export async function parseResumeMultimodal(pdfBase64: string): Promise<ParsedResume> {
  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: PDF_PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        // Temperature 0 — deterministic. Re-uploads of the same PDF must yield
        // the same role_function, target_role_functions, and years_experience,
        // otherwise downstream matching changes between runs without the
        // resume actually changing.
        temperature: 0,
      },
    });
    return result.response.text();
  }, { operation: "resume_pdf_parse" });

  return sanitizeParsedResume(parseJsonObject<ParsedResume>(text));
}

/**
 * Fallback path: extract text from the PDF server-side, then pass the text
 * to any text-capable LLM via the standard provider router. Uses the
 * `resume_text_parse` operation policy.
 *
 * The caller should only invoke this after the multimodal path fails;
 * exposed for diagnostic UIs.
 */
export async function parseResumeFromPdfViaText(
  pdfBase64: string,
  /** Optional original error to chain when text extraction also fails. */
  primaryErr?: unknown,
): Promise<ParsedResume> {
  const buffer = Buffer.from(pdfBase64, "base64");
  let extractedText: string;
  try {
    extractedText = await extractPdfText(buffer);
  } catch (extractErr) {
    // PDF couldn't be turned into text either — surface a useful aggregate
    // error so the caller can show the user something actionable.
    const reason = errKind(extractErr);
    logEvent("error", "resume_pdf_text_extract_failed", {
      reason,
      primary: primaryErr ? errKind(primaryErr) : null,
    });
    throw new Error(`Resume parse failed: ${reason}`);
  }
  return await parseResumeFromText(extractedText);
}

/**
 * Pure text → ParsedResume helper. Used directly when the caller already
 * has plain text (e.g. a Reactive-Resume JSON import that has no PDF).
 */
export async function parseResumeFromText(resumeText: string): Promise<ParsedResume> {
  if (!resumeText || resumeText.trim().length < 80) {
    throw new Error("Resume text too short to parse");
  }
  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${TEXT_PROMPT}\n${resumeText}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0,
      },
    });
    return result.response.text();
  }, { operation: "resume_text_parse" });

  return sanitizeParsedResume(parseJsonObject<ParsedResume>(text));
}

// ── Diagnostics helpers ────────────────────────────────────────────────────

function errKind(err: unknown): string {
  if (err && typeof err === "object" && "name" in err && typeof err.name === "string") {
    if (err.name === "LlmRunError") {
      const detail = (err as { detail?: { kind?: string } }).detail;
      return detail?.kind ?? "llm_unknown";
    }
    if (err.name === "PdfTextExtractionError") {
      return (err as { kind?: string }).kind ?? "pdf_extract_unknown";
    }
  }
  if (err instanceof Error) return err.message.slice(0, 80);
  return "unknown";
}
