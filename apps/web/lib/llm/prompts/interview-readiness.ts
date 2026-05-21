// Interview Lab — Readiness Mirror.
//
// Computes 4 sub-scores (DSA / System Design / Behavioral / Domain) from
// the candidate's parsed resume + a 12-question self-assessment quiz.
// Each sub-score is 0..100 with a "lift +10 this week" action.
//
// Includes a DETERMINISTIC fallback that still returns sane scores when
// every LLM provider is exhausted — derived purely from resume facts and
// the quiz answers without any LLM call. UX degrades gracefully.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { parseJsonObject } from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

/** 12-question quiz answers. Keys match the quiz UI field names. */
export interface ReadinessAssessment {
  dsa_last_solved: "today" | "this_week" | "this_month" | "six_months_plus" | "never";
  dsa_arrays_hashing: 1 | 2 | 3 | 4 | 5;
  dsa_trees_graphs:   1 | 2 | 3 | 4 | 5;
  dsa_dp_advanced:    1 | 2 | 3 | 4 | 5;
  sd_high_scale:      "yes" | "no" | "unsure";
  sd_owned_service:   "multiple" | "one" | "none";
  sd_cap_theorem:     "yes" | "kind_of" | "no";
  beh_recent:         "yes" | "planning" | "no";
  beh_failure:        "yes" | "kind_of" | "no";
  domain_microservices: 1 | 2 | 3 | 4 | 5;
  years_experience:   number;
  target_role_function: string;
}

export interface ReadinessScores {
  dsa_score: number;
  system_design_score: number;
  behavioral_score: number;
  domain_score: number;
  actions: ReadinessAction[];
  /** Set when the score came from the deterministic fallback rather than
   *  an LLM call. UI may render the row with a softer accent. */
  is_fallback: boolean;
}

export interface ReadinessAction {
  /** One of: dsa / system_design / behavioral / domain */
  dimension: "dsa" | "system_design" | "behavioral" | "domain";
  /** Short imperative — "Solve 3 medium-hashmap problems this week" */
  headline: string;
  /** 1-sentence why; concrete and specific. */
  why: string;
  /** Estimated points lifted if completed this week. */
  estimated_lift: number;
}

const ACTION_SCHEMA_ITEM: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    dimension:       { type: SchemaType.STRING },
    headline:        { type: SchemaType.STRING },
    why:             { type: SchemaType.STRING },
    estimated_lift:  { type: SchemaType.NUMBER },
  },
  required: ["dimension", "headline", "why", "estimated_lift"],
};

const SCORES_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    dsa_score:           { type: SchemaType.NUMBER },
    system_design_score: { type: SchemaType.NUMBER },
    behavioral_score:    { type: SchemaType.NUMBER },
    domain_score:        { type: SchemaType.NUMBER },
    actions:             { type: SchemaType.ARRAY, items: ACTION_SCHEMA_ITEM },
  },
  required: ["dsa_score", "system_design_score", "behavioral_score", "domain_score", "actions"],
};

const PROMPT = `You are an interview-readiness coach for Indian engineers preparing for
top product companies (Google / Microsoft / Razorpay / Flipkart / etc.).

Read the candidate's parsed resume + their 12-question self-assessment.
Return 4 sub-scores (0..100) and ONE concrete weekly action per dimension
that would lift the score by ~10.

DIMENSIONS:
- DSA: comfort with LeetCode-style problems. Anchor to: how recently they
  solved one, their self-rated comfort across arrays / trees / DP.
- System Design: ability to design product-scale systems. Anchor to:
  years of experience, scale they've operated at, owned services count.
- Behavioral: readiness for STAR-format behavioral rounds. Anchor to:
  recent practice, comfort with failure stories. Note: the user may
  already have a Story Bank — they get higher behavioral score
  automatically; if not, this dimension trails.
- Domain: alignment of their tech stack with their TARGET role function
  (target_role_function from the quiz). Mismatch lowers domain score.

SCORING GUIDELINES:
- 90+: Confidently above the product-company bar.
- 70-89: Ready with light brush-up.
- 50-69: Needs 4-8 focused weeks of prep.
- <50: Significant gap; surface in the action below.

ACTION RULES:
- One action per dimension (4 total).
- Concrete: name the topic / company / resource if relevant.
- "headline" reads like a checkbox task.
- "estimated_lift" is the realistic point gain by next week if completed.
- "why" ties the action to a specific signal in their resume / quiz.

Return ONLY the JSON object. No prose around it.`;

export async function computeInterviewReadiness(input: {
  parsed: ParsedResume;
  assessment: ReadinessAssessment;
  /** How many STAR stories the user already has saved. Boosts behavioral. */
  storyBankSize?: number;
}): Promise<ReadinessScores> {
  const source = buildSourceText(input);
  try {
    const text = await runWithRetry("light", async (model) => {
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: `${PROMPT}\n\n=== INPUT ===\n${source}` }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCORES_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 2000,
        },
      });
      return result.response.text();
    }, { operation: "interview_readiness_score" });

    const parsed = parseJsonObject<ReadinessScores>(text);
    return sanitise(parsed, { fallback: false });
  } catch {
    // Every provider in the chain failed (Gemini exhausted + free providers
    // dead). Return a deterministic best-effort score from quiz answers so
    // the user still sees something useful.
    return deterministicReadinessFallback(input);
  }
}

// ── Deterministic fallback ────────────────────────────────────────────────

function deterministicReadinessFallback(input: {
  parsed: ParsedResume;
  assessment: ReadinessAssessment;
  storyBankSize?: number;
}): ReadinessScores {
  const a = input.assessment;
  const yrs = input.parsed.total_years_experience || a.years_experience || 0;

  const dsaRecency = ({ today: 30, this_week: 22, this_month: 14, six_months_plus: 6, never: 0 } as const)[a.dsa_last_solved];
  const dsaSkill = (a.dsa_arrays_hashing + a.dsa_trees_graphs + a.dsa_dp_advanced) * 4; // 12..60
  const dsa = clamp(dsaRecency + dsaSkill, 0, 100);

  const sdScale = ({ yes: 30, no: 8, unsure: 12 } as const)[a.sd_high_scale];
  const sdOwn = ({ multiple: 28, one: 18, none: 4 } as const)[a.sd_owned_service];
  const sdCap = ({ yes: 18, kind_of: 10, no: 2 } as const)[a.sd_cap_theorem];
  const sdYears = Math.min(yrs * 2, 16); // up to 16 pts for years
  const sd = clamp(sdScale + sdOwn + sdCap + sdYears, 0, 100);

  const stories = input.storyBankSize ?? 0;
  const storyBoost = Math.min(stories * 4, 32);
  const behRecent = ({ yes: 28, planning: 14, no: 4 } as const)[a.beh_recent];
  const behFail = ({ yes: 22, kind_of: 12, no: 2 } as const)[a.beh_failure];
  const beh = clamp(storyBoost + behRecent + behFail, 0, 100);

  const domain = clamp(40 + a.domain_microservices * 8 + Math.min(yrs * 2, 16), 0, 100);

  return sanitise({
    dsa_score: dsa,
    system_design_score: sd,
    behavioral_score: beh,
    domain_score: domain,
    actions: [
      {
        dimension: "dsa",
        headline: dsa < 70 ? "Solve 5 medium array / hashmap problems on LeetCode" : "Solve 2 hard graph / DP problems this week",
        why: dsa < 70
          ? "Daily DSA repetition is the fastest way to lift familiarity"
          : "You're past the basics; push the hard end of the distribution",
        estimated_lift: 10,
      },
      {
        dimension: "system_design",
        headline: sd < 70 ? "Re-design one project from your resume at 10x scale" : "Read 2 tech-blog system-design write-ups from your target companies",
        why: sd < 70
          ? "Your own past project is the lowest-friction starting point"
          : "Calibrate your bar to the target company's actual systems",
        estimated_lift: 10,
      },
      {
        dimension: "behavioral",
        headline: stories < 8 ? "Generate your Story Bank — aim for 8 STAR stories" : "Rehearse 2 stories out loud this week",
        why: stories < 8
          ? "Behavioral rounds are won on preparation, not improvisation"
          : "Verbal rehearsal cements pacing and confidence",
        estimated_lift: 12,
      },
      {
        dimension: "domain",
        headline: `Map your top-5 skills against ${a.target_role_function} JD must-haves`,
        why: "Match analysis surfaces the 1-2 tools you can pick up fastest",
        estimated_lift: 8,
      },
    ],
    is_fallback: true,
  }, { fallback: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildSourceText(input: {
  parsed: ParsedResume;
  assessment: ReadinessAssessment;
  storyBankSize?: number;
}): string {
  const p = input.parsed;
  const a = input.assessment;
  const lines: string[] = [];
  lines.push(`Resume facts:`);
  lines.push(`- current_role: ${p.current_role}`);
  lines.push(`- role_function: ${p.role_function}`);
  lines.push(`- target_role_functions: ${p.target_role_functions.join(", ")}`);
  lines.push(`- years_experience: ${p.total_years_experience}`);
  lines.push(`- tech_stack: ${p.tech_stack.slice(0, 30).join(", ")}`);
  lines.push(`- companies: ${p.companies.map((c) => `${c.role}@${c.name}(${c.years}y${c.is_product_company ? ",product" : ",services"})`).join("; ")}`);
  if (p.products_built.length > 0) {
    lines.push(`- products: ${p.products_built.slice(0, 8).join(" | ")}`);
  }
  lines.push(`\nSelf-assessment (12 questions):`);
  lines.push(JSON.stringify(a, null, 2));
  if (typeof input.storyBankSize === "number") {
    lines.push(`\nstory_bank_size: ${input.storyBankSize} (their existing STAR-story count)`);
  }
  return lines.join("\n");
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function sanitise(s: Partial<ReadinessScores>, opts: { fallback: boolean }): ReadinessScores {
  return {
    dsa_score:           clamp(s.dsa_score ?? 0, 0, 100),
    system_design_score: clamp(s.system_design_score ?? 0, 0, 100),
    behavioral_score:    clamp(s.behavioral_score ?? 0, 0, 100),
    domain_score:        clamp(s.domain_score ?? 0, 0, 100),
    actions:             (s.actions ?? []).slice(0, 4).map(sanitiseAction).filter(Boolean) as ReadinessAction[],
    is_fallback:         opts.fallback,
  };
}

function sanitiseAction(a: ReadinessAction): ReadinessAction | null {
  const validDims = new Set(["dsa", "system_design", "behavioral", "domain"]);
  if (!validDims.has(a.dimension)) return null;
  const headline = (a.headline ?? "").trim();
  const why = (a.why ?? "").trim();
  if (headline.length < 6) return null;
  return {
    dimension: a.dimension,
    headline,
    why,
    estimated_lift: clamp(a.estimated_lift ?? 5, 0, 25),
  };
}
