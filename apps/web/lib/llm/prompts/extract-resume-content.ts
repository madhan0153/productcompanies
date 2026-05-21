// Resume Intelligence — Step 0: rich content extraction from the source PDF.
//
// WHY THIS EXISTS:
// The original `parseResumePdf` extracts STRUCTURED fields only:
// companies[].role is the role TITLE ("Senior Data Engineer"), not the
// bullets describing what the candidate actually did. products_built is
// project NAMES, not bullet content. This is enough for matching but
// not enough for resume *enhancement* — there's nothing real to rewrite.
//
// This module re-parses the PDF with a Gemini call tuned to surface the
// FULL bullet content per role and per project. The output drops back into
// the diagnose → rewrite pipeline so weak bullets actually have content to
// improve.
//
// Cost: one extra heavy-tier call per enhancement diagnosis. Already
// quota-counted by the enhancement quota (5 / 30d).
//
// Cached on enhanced_resumes.diagnosis via the existing row → no repeated
// extractions for the same review session.
//
// FALLBACK PATH:
// When the multimodal Gemini path fails (keys exhausted, no PDF-capable
// provider configured), extract text server-side and route through any
// text-capable LLM. Slightly lower fidelity (no layout cues) but keeps the
// enhancement pipeline working when Gemini exhausts.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { extractPdfText } from "@/lib/resume/pdf-text";
import { logEvent } from "@/lib/observability/log";

export interface ExtractedResumeContent {
  /** Concise professional summary, verbatim if the resume has one. */
  summary: string;
  /** Skills list — verbatim categorisation if present, else flat list. */
  skills: string[];
  /** Per-role bullets. company_name MUST match what parseResumePdf produced
   *  so the diagnosis prompt can correlate. */
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    /** Verbatim bullet lines from the resume. Each ≤ 320 chars. */
    bullets: string[];
  }>;
  /** Per-project bullets. project_name MUST match products_built ordering
   *  when possible so downstream rewrites can patch back accurately. */
  projects: Array<{
    name: string;
    /** Verbatim description lines. */
    bullets: string[];
  }>;
  /** Optional: education entries. Used as filler in synthesised text. */
  education: Array<{
    institution: string;
    degree: string;
    year: number | null;
  }>;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    skills:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    experience: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company:  { type: SchemaType.STRING },
          role:     { type: SchemaType.STRING },
          duration: { type: SchemaType.STRING },
          bullets:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["company", "role", "duration", "bullets"],
      },
    },
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:    { type: SchemaType.STRING },
          bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["name", "bullets"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree:      { type: SchemaType.STRING },
          year:        { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["institution", "degree"],
      },
    },
  },
  required: ["summary", "skills", "experience", "projects", "education"],
};

const COMMON_RULES = `CRITICAL RULES:
1. EVERY bullet must be COPIED VERBATIM from the resume. Do not paraphrase,
   abbreviate, or fix typos. If the resume says "Worked on backend", the
   bullet is "Worked on backend" — even if that's a weak phrasing.
2. Bullets are the action lines under each role + project. They typically
   start with a verb or a dash. Capture every bullet, in order.
3. If a role has no bullets in the source (just a title), return an EMPTY
   bullets array for that role. Do NOT fabricate bullets to fill the gap.
4. duration: copy the date range as written ("Jan 2023 – Present",
   "2020 – 2022", "6 months", etc.). If unclear, use an empty string.
5. summary: copy the professional summary section verbatim. If absent,
   return an empty string. Do NOT compose one.
6. skills: list every skill / technology / tool mentioned in the skills
   section (or wherever skills appear). Preserve original ordering.
7. projects: include personal projects, open-source contributions,
   case-studies — whatever appears under a "Projects" / "Open Source" /
   similar heading. EACH project's bullets are its description lines.

Return JSON conforming to the schema. No prose outside the JSON.`;

const PDF_PROMPT = `You are extracting the FULL bullet content from a resume PDF for an
enhancement pipeline. The downstream pipeline will analyse each bullet for
weaknesses (weak verbs, missing metrics, vague scope) and suggest rewrites,
so the EXTRACTION quality determines whether the enhancement works.

${COMMON_RULES}`;

const TEXT_PROMPT = `You are extracting the FULL bullet content from a resume text dump for an
enhancement pipeline. The downstream pipeline will analyse each bullet for
weaknesses (weak verbs, missing metrics, vague scope) and suggest rewrites,
so the EXTRACTION quality determines whether the enhancement works.

The text below is extracted from a PDF and may have wrapping artefacts;
treat lines starting with "•", "-", or that follow a role/project header
as bullets.

${COMMON_RULES}

=== RESUME TEXT BEGINS ===`;

/**
 * Extract verbatim resume content. Tries multimodal Gemini first; on
 * failure, extracts text from the PDF server-side and routes the text to
 * any text-capable provider.
 */
export async function extractResumeContent(pdfBase64: string): Promise<ExtractedResumeContent> {
  try {
    return await extractResumeContentMultimodal(pdfBase64);
  } catch (primaryErr) {
    logEvent("warn", "resume_content_multimodal_failed", {
      reason: errKind(primaryErr),
    });
    return await extractResumeContentFromPdfViaText(pdfBase64, primaryErr);
  }
}

async function extractResumeContentMultimodal(pdfBase64: string): Promise<ExtractedResumeContent> {
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
        temperature: 0,         // deterministic — same PDF, same bullets
        maxOutputTokens: 6000,
      },
    });
    return result.response.text();
  }, { operation: "resume_content_extract" });

  return sanitise(JSON.parse(text) as ExtractedResumeContent);
}

async function extractResumeContentFromPdfViaText(
  pdfBase64: string,
  primaryErr?: unknown,
): Promise<ExtractedResumeContent> {
  const buffer = Buffer.from(pdfBase64, "base64");
  let extractedText: string;
  try {
    extractedText = await extractPdfText(buffer);
  } catch (extractErr) {
    const reason = errKind(extractErr);
    logEvent("error", "resume_content_text_extract_failed", {
      reason,
      primary: primaryErr ? errKind(primaryErr) : null,
    });
    throw new Error(`Resume content extraction failed: ${reason}`);
  }
  return await extractResumeContentFromText(extractedText);
}

/** Pure text → ExtractedResumeContent helper. */
export async function extractResumeContentFromText(resumeText: string): Promise<ExtractedResumeContent> {
  if (!resumeText || resumeText.trim().length < 80) {
    throw new Error("Resume text too short to extract bullets");
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
        maxOutputTokens: 6000,
      },
    });
    return result.response.text();
  }, { operation: "resume_text_content_extract" });

  return sanitise(JSON.parse(text) as ExtractedResumeContent);
}

function sanitise(parsed: ExtractedResumeContent): ExtractedResumeContent {
  // Sanitise: drop empty/whitespace bullets so downstream pipelines don't
  // see garbage "weak bullets" they can't improve.
  parsed.experience = (parsed.experience ?? []).map((r) => ({
    ...r,
    bullets: (r.bullets ?? []).map((b) => b.trim()).filter((b) => b.length > 4),
  }));
  parsed.projects = (parsed.projects ?? []).map((p) => ({
    ...p,
    bullets: (p.bullets ?? []).map((b) => b.trim()).filter((b) => b.length > 4),
  }));
  return parsed;
}

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

/**
 * Render extracted content to flat text the diagnosis prompt can consume.
 * The diagnosis prompt quotes from this text verbatim — bullet positions
 * (section + index) become the patch target for finalise.
 */
export function renderExtractedAsText(content: ExtractedResumeContent): string {
  const parts: string[] = [];
  if (content.summary) parts.push("Summary\n" + content.summary);

  if (content.skills.length > 0) {
    parts.push("\nSkills\n" + content.skills.join(", "));
  }

  if (content.experience.length > 0) {
    parts.push("\nExperience");
    for (const r of content.experience) {
      parts.push(`\n${r.role} — ${r.company}${r.duration ? `  (${r.duration})` : ""}`);
      for (const b of r.bullets) parts.push(`• ${b}`);
    }
  }

  if (content.projects.length > 0) {
    parts.push("\nProjects");
    for (const p of content.projects) {
      parts.push(`\n${p.name}`);
      for (const b of p.bullets) parts.push(`• ${b}`);
    }
  }

  if (content.education.length > 0) {
    parts.push("\nEducation");
    for (const e of content.education) {
      const y = e.year ? `, ${e.year}` : "";
      parts.push(`${e.degree} — ${e.institution}${y}`);
    }
  }

  return parts.join("\n");
}

// hasUsableContent removed: the auto-enhance pipeline now generates
// content for empty roles/projects via the gap-fill step instead of
// blocking thin resumes. The check was user-hostile — it told people
// "you can't use this until you write more first", which is exactly
// what the product is supposed to help with.
