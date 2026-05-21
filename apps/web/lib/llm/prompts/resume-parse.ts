import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { extractPdfText } from "@/lib/resume/pdf-text";
import { logEvent } from "@/lib/observability/log";

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
        },
        required: ["name", "role", "years", "is_product_company"],
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
For estimated_current_lpa: estimate in LPA (lakhs per annum) based on role seniority, company tier, and years of experience in India market. Return null/omit if insufficient data.`;

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

  return JSON.parse(text) as ParsedResume;
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

  return JSON.parse(text) as ParsedResume;
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
