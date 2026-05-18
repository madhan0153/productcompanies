// Gap-fill prompt — generates content for sections that have NO bullets.
//
// Why this exists:
// Many real-world resumes (especially senior engineers from services
// backgrounds) have entries that are just role titles + project names with
// little or no descriptive content. The diagnose+rewrite path can't help
// those entries — there's nothing to rewrite. This prompt fills those gaps
// by GENERATING 2-3 plausible bullets per empty slot, grounded in:
//
//   • The candidate's tech_stack (skills they actually have)
//   • The role title (what kind of work they did)
//   • The company name + years (well-known companies have known business
//     areas; tenure constrains the seniority of work)
//   • The summary + adjacent role descriptions (cross-referenceable context)
//
// AUTHENTICITY MODEL:
// Every gap-filled bullet is marked `inferred: true`. The user sees
// prominent risk flags in the result UI and is told these are AI-generated
// drafts they should edit. We avoid specific metrics ("led a team of 8" →
// "led a small team"), specific products the user didn't name, and any
// claim of leadership not implied by the title. The output is a STARTING
// POINT, not a finished bullet.
//
// Cost: one heavy-tier Gemini call per autoEnhance run. Counted against
// the existing enhancement quota.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ExtractedResumeContent } from "./extract-resume-content";

export interface GapFillRoleSuggestion {
  /** Matches ExtractedResumeContent.experience[i].company so the merger
   *  can map back to the right role. */
  company: string;
  role: string;
  /** 2-3 plausible bullets the candidate could have done in this role.
   *  Hedged language ("contributed to", "worked on") preferred over
   *  strong ownership verbs unless the title clearly implies leadership. */
  bullets: string[];
}

export interface GapFillProjectSuggestion {
  /** Matches ExtractedResumeContent.projects[i].name. */
  name: string;
  /** A short 1-2 sentence description. May reference techs from the
   *  candidate's resume-wide stack. */
  description: string;
}

export interface GapFillResult {
  /** Whether the summary needs a fresh write (was empty / too short). */
  summary_needed: boolean;
  /** Suggested summary, when needed. ≤ 3 sentences. */
  summary_suggestion: string;
  /** Per-role fills — only for roles that had ZERO bullets in extraction. */
  role_fills: GapFillRoleSuggestion[];
  /** Per-project fills — only for projects without descriptions. */
  project_fills: GapFillProjectSuggestion[];
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary_needed:     { type: SchemaType.BOOLEAN },
    summary_suggestion: { type: SchemaType.STRING },
    role_fills: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING },
          role:    { type: SchemaType.STRING },
          bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["company", "role", "bullets"],
      },
    },
    project_fills: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:        { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["summary_needed", "summary_suggestion", "role_fills", "project_fills"],
};

const SYSTEM = `You are filling content gaps in an Indian engineer's resume.
This candidate has roles and projects with little or no descriptive text —
your job is to draft plausible content based on what's already in their
resume, NOT to invent experience.

ABSOLUTE RULES — violating any of these is a critical failure:

1. NEVER invent companies, dates, project names, technologies, scale numbers
   (user counts, revenue, throughput), team sizes, awards, certifications,
   or business outcomes that aren't already in the candidate's resume.

2. You MAY use techs from the candidate's RESUME-WIDE tech_stack in your
   bullets (these are skills they listed themselves). Pick techs that
   plausibly fit the role.

3. For role bullets — produce 2-3 short bullets that describe TYPICAL
   responsibilities for the title. Use hedged ownership language:
      ✅ "Contributed to" / "Worked on" / "Built features for" / "Involved in"
      ❌ "Owned" / "Led" / "Architected" / "Spearheaded"
   (unless the role title explicitly says lead/principal/staff/manager)

4. For projects — produce ONE 1-2 sentence description that says what
   the project does and mentions 1-2 techs that fit. Plain English.

5. NEVER fabricate a metric. NEVER write "5M users", "₹10Cr saved",
   "p99 < 100ms" etc. These are user-verified facts only.

6. Keep tense consistent: past tense for past roles, present for current.

7. summary_needed: true ONLY if the resume's summary section is empty or
   under 40 characters. If a real summary exists, return false and an
   empty suggestion — do not rewrite a working summary.

8. role_fills: ONLY for roles where bullets array is EMPTY in the input.
   Roles with existing bullets are handled by a separate rewriter — skip
   them here.

9. project_fills: ONLY for projects where bullets array is EMPTY in the
   input.

10. If a role/project already has substantial content, do not produce a
    suggestion. Empty role_fills / project_fills arrays are fine and
    correct.

Output JSON per the schema. No prose outside the JSON.`;

export interface GapFillInput {
  /** The extracted resume content (Step 0 output). */
  extracted: ExtractedResumeContent;
  /** Role function classifier — drives the kind of bullets we propose. */
  role_function: string | null;
  /** Top market keywords (must-haves across the user's shortlist) — used
   *  to bias generated bullets toward roles the user is targeting. */
  market_keywords: string[];
  /** Years of experience — caps the seniority of generated language. */
  years_experience: number | null;
}

function buildUserPrompt(input: GapFillInput): string {
  const stack = input.extracted.skills.slice(0, 30).join(", ");
  const yrs = input.years_experience != null
    ? `${input.years_experience} years of experience total`
    : "unknown total experience";
  const fn = input.role_function ?? "(role function not classified — infer from titles)";

  // Only include roles/projects with EMPTY bullets — saves tokens and
  // tells the model exactly which slots need filling.
  const emptyRoles = input.extracted.experience
    .filter((r) => r.bullets.length === 0)
    .map((r) => `  - company: ${JSON.stringify(r.company)}, role: ${JSON.stringify(r.role)}, duration: ${JSON.stringify(r.duration)}`)
    .join("\n");

  const emptyProjects = input.extracted.projects
    .filter((p) => p.bullets.length === 0)
    .map((p) => `  - name: ${JSON.stringify(p.name)}`)
    .join("\n");

  const summaryStatus = (input.extracted.summary ?? "").trim().length < 40
    ? "EMPTY OR TOO SHORT — generate a 2-3 sentence summary."
    : `OK (${input.extracted.summary.length} chars) — return summary_needed=false.`;

  return `Candidate context:
  Role function:        ${fn}
  ${yrs}
  Tech stack:           ${stack || "(none listed)"}
  Market keywords for target roles: ${input.market_keywords.slice(0, 15).join(", ") || "(none)"}

Current summary status: ${summaryStatus}

Roles with NO bullets to fill (others are skipped — handled by the rewriter):
${emptyRoles || "  (none — all roles have bullets)"}

Projects with NO descriptions to fill:
${emptyProjects || "  (none — all projects have descriptions)"}

Produce a GapFillResult JSON. Remember: hedge ownership unless title says
lead+; never invent metrics; use only techs from the stack above.`;
}

export async function generateGapFill(input: GapFillInput): Promise<GapFillResult> {
  const needsSummary = (input.extracted.summary ?? "").trim().length < 40;
  const emptyRoles = input.extracted.experience.filter((r) => r.bullets.length === 0);
  const emptyProjects = input.extracted.projects.filter((p) => p.bullets.length === 0);

  // Short-circuit: nothing to fill.
  if (!needsSummary && emptyRoles.length === 0 && emptyProjects.length === 0) {
    return {
      summary_needed: false,
      summary_suggestion: "",
      role_fills: [],
      project_fills: [],
    };
  }

  const prompt = buildUserPrompt(input);

  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        // Slightly higher temperature so multiple roles don't produce
        // identical-sounding bullets. Still well below "creative".
        temperature: 0.35,
        maxOutputTokens: 3000,
      },
    });
    return result.response.text();
  });

  const parsed = JSON.parse(text) as GapFillResult;

  // Sanitise: clamp bullets per role to 3, ensure no empty strings.
  parsed.role_fills = (parsed.role_fills ?? [])
    .map((r) => ({
      ...r,
      bullets: (r.bullets ?? [])
        .map((b) => b.trim())
        .filter((b) => b.length > 8)
        .slice(0, 3),
    }))
    .filter((r) => r.bullets.length > 0);

  parsed.project_fills = (parsed.project_fills ?? [])
    .map((p) => ({
      ...p,
      description: (p.description ?? "").trim(),
    }))
    .filter((p) => p.description.length > 8);

  // If the model said summary wasn't needed, force suggestion empty.
  if (!parsed.summary_needed) parsed.summary_suggestion = "";

  return parsed;
}
