// Interview Lab — personalised company × round cheatsheet.
//
// For a (company_slug, role_function, round_type) triple, generates a
// markdown cheatsheet anchored to the candidate's resume. Result is
// cached on interview_company_cheatsheet — same (user, company, role,
// round) row is re-served until resume_signature changes.
//
// Privacy: candidate's resume + companies/products are visible to the
// LLM via the input source text; logged only as success/failure.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { parseJsonObject } from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export type CheatsheetRound =
  | "phone_screen"
  | "dsa"
  | "system_design"
  | "behavioral"
  | "hiring_manager";

export const CHEATSHEET_ROUND_DISPLAY: Record<CheatsheetRound, string> = {
  phone_screen:   "Phone screen",
  dsa:            "DSA / Coding round",
  system_design:  "System Design round",
  behavioral:     "Behavioral round",
  hiring_manager: "Hiring manager round",
};

export interface CheatsheetInput {
  company_slug: string;
  company_name: string;
  role_function: string;
  round_type: CheatsheetRound;
  parsed: ParsedResume;
}

export interface Cheatsheet {
  title: string;
  body_markdown: string;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title:         { type: SchemaType.STRING },
    body_markdown: { type: SchemaType.STRING },
  },
  required: ["title", "body_markdown"],
};

const PROMPT = `You are an interview-prep coach writing a 1-page CHEATSHEET for ONE round
at ONE specific product company, personalised to THIS candidate.

Goal: maximum useful information per pixel. The candidate is reading this
on their phone in the 20 minutes before an interview. No fluff.

REQUIRED MARKDOWN STRUCTURE (use these exact section headers):

## What to expect
3-5 bullets about format, duration, typical interviewer profile, common
question style at this specific company for this round.

## High-frequency topics
5-8 bullets, ordered by how often they appear. Reference the candidate's
tech stack when relevant ("your Spring Boot background gives you an edge
here", "expect them to dig into Kafka — your resume claims it").

## What to prep this week
3-5 SPECIFIC tasks the candidate should do given their current resume +
gaps. Each task is concrete (problem set, doc to read, story to rehearse).

## Red flags to avoid
3-4 common mistakes interviewers at this company watch for.

## Sample question + sketch answer
ONE typical question for this round + a tight outline of what a strong
answer looks like. For DSA / system design, summarise the structure
without giving away full code.

INVARIANTS:
- Markdown only inside body_markdown. No HTML.
- Anchor at least 2 places in the cheatsheet to a specific signal in the
  candidate's resume (company name, tech, years).
- NEVER invent metrics or interview leaks. Use realistic generic patterns.
- title: 4-10 words, e.g. "Razorpay backend DSA cheatsheet".
- body_markdown: 700-1500 characters typical; never exceed 3000.

Return ONLY the JSON object.`;

export async function generateCheatsheet(input: CheatsheetInput): Promise<Cheatsheet> {
  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${PROMPT}\n\n=== INPUT ===\n${buildSourceText(input)}` }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 2500,
      },
    });
    return result.response.text();
  }, { operation: "interview_cheatsheet_personalise" });

  const parsed = parseJsonObject<Cheatsheet>(text);
  return {
    title: (parsed.title ?? "").trim().slice(0, 120),
    body_markdown: (parsed.body_markdown ?? "").trim().slice(0, 4000),
  };
}

function buildSourceText(input: CheatsheetInput): string {
  return [
    `Company: ${input.company_name} (slug: ${input.company_slug})`,
    `Role function: ${input.role_function}`,
    `Round type: ${CHEATSHEET_ROUND_DISPLAY[input.round_type]}`,
    "",
    "=== CANDIDATE ===",
    `Name: ${input.parsed.name}`,
    `Current role: ${input.parsed.current_role}`,
    `Years: ${input.parsed.total_years_experience}`,
    `Function: ${input.parsed.role_function}`,
    `Tech stack: ${input.parsed.tech_stack.slice(0, 30).join(", ")}`,
    `Recent companies: ${input.parsed.companies.slice(0, 5).map((c) => `${c.role} at ${c.name} (${c.years}y${c.is_product_company ? ",product" : ",services"})`).join("; ")}`,
    input.parsed.products_built.length > 0
      ? `Products built: ${input.parsed.products_built.slice(0, 8).join(" | ")}`
      : "",
    input.parsed.summary ? `Summary: ${input.parsed.summary.slice(0, 800)}` : "",
  ].filter(Boolean).join("\n");
}
