// Interview Lab — per-(user, problem) DSA explainer.
//
// Lightweight LLM call that ties a static DSA problem to the candidate's
// resume (recent companies, products, tech stack) and target companies.
// The actual problem catalogue lives in @prodmatch/shared/dsa-catalog.ts.
//
// Caching: server actions persist the result on
// interview_daily_dispatch.personalised_note so this is called at most
// once per (user, problem) — usually once per day.
//
// Deterministic fallback: a generic explanation derived from the problem's
// pattern + companies tags.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import {
  parseJsonObject,
  type DsaProblem,
  DSA_PATTERNS_DISPLAY,
} from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export interface DsaExplanation {
  /** 2-3 sentence story tying the candidate's resume to the pattern. */
  personalised_note: string;
  /** 2-3 quick wins the candidate gets from solving this. */
  what_youll_learn: string[];
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    personalised_note: { type: SchemaType.STRING },
    what_youll_learn:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["personalised_note", "what_youll_learn"],
};

const PROMPT = `You are an interview-prep coach explaining why TODAY's DSA problem matters
for THIS candidate. The candidate is an Indian engineer preparing for the
51 approved product companies.

INPUT: the problem (title + pattern + companies), the candidate's parsed
resume (companies, products, tech stack), and their target companies.

OUTPUT a small JSON with:
- personalised_note: 2-3 sentences. Reference at most ONE of the
  candidate's past projects / products / companies by name. Tie the
  pattern to a real-world parallel they would have already done at work
  (e.g. "two-pointers comes up whenever you have to scan a sorted billing
  ledger looking for duplicate transactions, which you did at PayWise").
  NEVER invent details that aren't in the source resume.
- what_youll_learn: 2-3 short bullets (each < 12 words) — concrete skills
  this problem strengthens.

INVARIANTS:
- First person POV is OK ("you" / "your").
- No code in the note.
- Do not reveal the problem solution.
- If the candidate has no relevant prior project, write a generic-but-warm
  note about the pattern without inventing a project.

Return ONLY the JSON object.`;

export async function explainDsaProblem(input: {
  problem: DsaProblem;
  parsed: ParsedResume;
  target_companies: string[];
}): Promise<DsaExplanation> {
  try {
    const text = await runWithRetry("light", async (model) => {
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: `${PROMPT}\n\n=== INPUT ===\n${buildSourceText(input)}` }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
          temperature: 0.4,
          maxOutputTokens: 600,
        },
      });
      return result.response.text();
    }, { operation: "interview_dsa_explain" });

    const parsed = parseJsonObject<DsaExplanation>(text);
    return sanitise(parsed);
  } catch {
    return deterministicExplanation(input);
  }
}

function buildSourceText(input: {
  problem: DsaProblem;
  parsed: ParsedResume;
  target_companies: string[];
}): string {
  return [
    `Problem: ${input.problem.title}`,
    `Pattern: ${DSA_PATTERNS_DISPLAY[input.problem.pattern]}`,
    `Difficulty: ${input.problem.difficulty}`,
    `Asked by (commonly): ${input.problem.companies.join(", ")}`,
    `Target companies: ${input.target_companies.join(", ") || "any of the 51"}`,
    `Candidate years: ${input.parsed.total_years_experience}`,
    `Tech stack: ${input.parsed.tech_stack.slice(0, 20).join(", ")}`,
    `Recent companies: ${input.parsed.companies.slice(0, 5).map((c) => `${c.role} at ${c.name}`).join("; ")}`,
    input.parsed.products_built.length > 0
      ? `Products built: ${input.parsed.products_built.slice(0, 8).join(" | ")}`
      : "",
  ].filter(Boolean).join("\n");
}

function deterministicExplanation(input: {
  problem: DsaProblem;
  parsed: ParsedResume;
  target_companies: string[];
}): DsaExplanation {
  const patternName = DSA_PATTERNS_DISPLAY[input.problem.pattern];
  const overlap = input.problem.companies.filter((c) => input.target_companies.includes(c));
  const overlapPart = overlap.length > 0
    ? ` It's commonly asked at ${overlap.slice(0, 2).join(" and ")}, which are on your target list.`
    : "";
  return {
    personalised_note:
      `Today's pattern is ${patternName}.${overlapPart} ` +
      `Solving "${input.problem.title}" reinforces the core idea you'll be expected to reach for under interview pressure.`,
    what_youll_learn: [
      `${patternName} pattern recognition`,
      "Faster instinct on similar problems",
      "Clean code under time pressure",
    ],
  };
}

function sanitise(d: DsaExplanation): DsaExplanation {
  return {
    personalised_note: (d.personalised_note ?? "").trim().slice(0, 800),
    what_youll_learn:  (d.what_youll_learn ?? [])
      .map((s) => (s ?? "").trim())
      .filter((s) => s.length > 3)
      .slice(0, 3),
  };
}
