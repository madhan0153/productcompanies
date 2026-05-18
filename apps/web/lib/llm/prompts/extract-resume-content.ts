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

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";

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

const PROMPT = `You are extracting the FULL bullet content from a resume PDF for an
enhancement pipeline. The downstream pipeline will analyse each bullet for
weaknesses (weak verbs, missing metrics, vague scope) and suggest rewrites,
so the EXTRACTION quality determines whether the enhancement works.

CRITICAL RULES:
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

export async function extractResumeContent(pdfBase64: string): Promise<ExtractedResumeContent> {
  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: PROMPT },
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
  });

  const parsed = JSON.parse(text) as ExtractedResumeContent;
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
