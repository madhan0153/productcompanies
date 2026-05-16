import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";
import type { ParsedJD } from "./jd-parse";
import type { CompBracket } from "@/lib/insights/comp-percentiles";

// Phase G — Fit Card.
// Replaces the flat strengths/gaps/reasoning trio with a structured, opinionated
// per-match analysis that actually helps the user decide AND act:
//   - verdict (the headline; replaces the score)
//   - hard_blockers (what would auto-reject you)
//   - soft_gaps (what weakens the application)
//   - resume_tweaks (concrete, copy-pasteable bullet edits, ranked by impact)
//   - level_read (under-/at-/over-leveled)
//   - comp_reality (target vs offered; honest)
//   - story_prompts (3 STAR prompts mapped to JD requirements)
//
// Career-ops: structured blocks. Rezi: keyword targeting via concrete bullets.
// We combine both, grounded in JD-parsed signal (not the description blob).

export type Verdict = "strong_fit" | "stretch" | "underqualified" | "mismatch" | "off_target";

export interface FitCard {
  verdict: Verdict;
  one_liner: string;                   // ≤ 140 chars — the headline
  hard_blockers: string[];             // each ≤ 110 chars; auto-reject reasons
  soft_gaps: string[];                 // each ≤ 110 chars; weakens but won't reject
  resume_tweaks: Array<{
    priority: 1 | 2 | 3;               // 1 = most impactful
    suggestion: string;                 // a concrete bullet to add or rephrase
    why: string;                        // ≤ 90 chars — what JD signal this serves
  }>;
  level_read: {
    band: "under" | "at" | "over";
    note: string;                       // ≤ 140 chars
  };
  comp_reality: {
    note: string;                       // ≤ 160 chars
    negotiate_to_lpa: number | null;    // realistic ask in LPA, null if unknown
  };
  story_prompts: Array<{
    requirement: string;                // the JD signal this story should hit
    prompt: string;                     // ≤ 140 chars; the scenario to recall
  }>;
  /** Sprint 3 Items 27/28 — populated by the engine, not the LLM. Lets the
   *  UI render "Grounded in n=X postings (median ₹Y, p75 ₹Z)" so users see
   *  the comp number is real-data-anchored, not a Gemini guess. Absent when
   *  the engine had no comp data for the bucket. */
  market_comp?: {
    basis: "exact" | "seniority_only";
    seniority: string;
    role_function: string | null;
    n: number;
    median: number;
    p75: number;
    p90: number;
  } | null;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    verdict:    { type: SchemaType.STRING },
    one_liner:  { type: SchemaType.STRING },
    hard_blockers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    soft_gaps:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    resume_tweaks: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          priority:   { type: SchemaType.NUMBER },
          suggestion: { type: SchemaType.STRING },
          why:        { type: SchemaType.STRING },
        },
        required: ["priority", "suggestion", "why"],
      },
    },
    level_read: {
      type: SchemaType.OBJECT,
      properties: {
        band: { type: SchemaType.STRING },
        note: { type: SchemaType.STRING },
      },
      required: ["band", "note"],
    },
    comp_reality: {
      type: SchemaType.OBJECT,
      properties: {
        note:             { type: SchemaType.STRING },
        negotiate_to_lpa: { type: SchemaType.NUMBER },
      },
      required: ["note"],
    },
    story_prompts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          requirement: { type: SchemaType.STRING },
          prompt:      { type: SchemaType.STRING },
        },
        required: ["requirement", "prompt"],
      },
    },
  },
  required: [
    "verdict", "one_liner", "hard_blockers", "soft_gaps",
    "resume_tweaks", "level_read", "comp_reality", "story_prompts",
  ],
};

export interface FitCardInput {
  resume: ParsedResume;
  jd: ParsedJD;
  job: {
    title: string;
    company: string;
    seniority: string | null;
    comp_lpa_min: number | null;
    comp_lpa_max: number | null;
    role_function: string | null;
    location: string;
  };
  candidate: {
    target_lpa: number | null;
    current_lpa: number | null;
    seniority: string | null;
    target_role_functions: string[];
    years: number | null;
  };
  /** Sprint 3 Item 28 — market-grounded comp percentiles for this seniority
   *  × role bucket. When present, the prompt instructs the model to cite
   *  these numbers instead of inventing a `negotiate_to_lpa`. */
  marketComp?: CompBracket | null;
}

function buildPrompt(x: FitCardInput): string {
  const r = x.resume;
  const jd = x.jd;
  const job = x.job;
  const c = x.candidate;

  const compStr = job.comp_lpa_min || job.comp_lpa_max
    ? `${job.comp_lpa_min ?? "?"}–${job.comp_lpa_max ?? "?"} LPA`
    : "not posted";

  // Sprint 3 Item 28 — grounded comp bracket. Becomes load-bearing text in
  // the prompt: the model is instructed to base `comp_reality.negotiate_to_lpa`
  // on these real percentiles instead of inventing a number.
  const marketCompLine = x.marketComp
    ? `Market comp for ${x.marketComp.seniority}${x.marketComp.role_function ? ` ${x.marketComp.role_function}` : ""} ` +
      `(n=${x.marketComp.n}, basis=${x.marketComp.basis}): ` +
      `median ${x.marketComp.median} LPA, p75 ${x.marketComp.p75} LPA, p90 ${x.marketComp.p90} LPA.`
    : "Market comp: insufficient posted data for this seniority × function. Say so honestly.";

  // Sprint 3 Item 29 — candidate's actual projects. Without this, story_prompts
  // map JD must-haves to generic scenarios ("describe a time you scaled a
  // service"). With it, the model can name specific resume bullets to dust off.
  const candidateProjects = (r.products_built ?? []).slice(0, 6);
  const projectsBlock = candidateProjects.length > 0
    ? `\nCANDIDATE PROJECTS (from resume)\n${candidateProjects.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
    : "\nCANDIDATE PROJECTS: (no project bullets extracted from resume)";

  return `You are a senior engineering recruiter who has placed 500+ candidates at
Indian product companies. Produce a Fit Card for this candidate × role.
Be RUTHLESSLY honest. The user is exhausted from spam-applying. Wasting
their time is worse than telling them "this isn't for you".

CANDIDATE
- Current role: ${r.current_role} (function: ${r.role_function})
- Years: ${c.years ?? r.total_years_experience}
- Seniority: ${c.seniority ?? "unknown"}
- Targets: ${c.target_role_functions.join(", ") || "unspecified"}
- Tech (top 15): ${r.tech_stack.slice(0, 15).join(", ")}
- Current LPA: ${c.current_lpa ?? "unknown"} | Target LPA: ${c.target_lpa ?? "unknown"}
- Companies: ${(r.companies ?? []).slice(0, 4).map((co) => `${co.name} (${co.role}, ${co.years}y)`).join("; ")}
- Summary: ${r.summary?.slice(0, 240) ?? ""}
${projectsBlock}

ROLE
- ${job.title} at ${job.company} — ${job.location}
- Function: ${job.role_function ?? "?"} | Crawler seniority: ${job.seniority ?? "?"}
- JD seniority signal: ${jd.jd_seniority_signal ?? "?"}
- JD years requirement: ${jd.jd_min_years ?? "?"}–${jd.jd_max_years ?? "?"}
- Work mode: ${jd.work_mode ?? "?"}
- Compensation posted: ${compStr}
- JD summary: ${jd.jd_summary}
- MUST-HAVE skills (JD): ${jd.must_have_skills.join(", ") || "(JD did not name any)"}
- NICE-TO-HAVE (JD): ${jd.nice_to_have_skills.join(", ") || "(none)"}

MARKET CONTEXT (use this — do NOT fabricate compensation numbers)
- ${marketCompLine}

PRODUCE
1. verdict — one of: strong_fit | stretch | underqualified | mismatch | off_target
   - strong_fit: candidate hits ≥80% must-haves AND years/level align
   - stretch: 60-80% must-haves OR one level under but JD shows growth path
   - underqualified: <60% must-haves OR ≥3 years under JD floor
   - mismatch: function-mismatch (frontend candidate × backend role)
   - off_target: function fine but candidate's *targets* point elsewhere
2. one_liner: max 140 chars. The single most useful sentence about this fit.
3. hard_blockers: items the candidate provably DOES NOT meet that the JD lists
   as required. Cite the JD signal. Empty array if none.
4. soft_gaps: nice-to-haves missing or weakly evidenced. ≤4 items.
5. resume_tweaks: 3 concrete edits, ranked by impact on THIS application.
   Each "suggestion" must be a literal bullet the candidate could paste into
   their resume — measurable verbs, real metrics if implied. The "why" cites
   which JD signal each serves. NO platitudes.
6. level_read: is the JD aiming at the candidate's level, above, or below?
   "note" explains in plain English whether this is a stretch or a coast.
7. comp_reality: honest read on whether the offered band beats the candidate's
   current comp and meets their target.
   - If posted compensation is missing, you MUST anchor on the MARKET CONTEXT
     above (cite median / p75 / p90). Say "Posted: not disclosed; market p75
     is X LPA for this band."
   - negotiate_to_lpa: pick the p75 from MARKET CONTEXT when JD comp is missing.
     If JD comp is posted, take min(JD max, market p75) so the user negotiates
     toward the realistic top of the actual band — never invent a number.
   - If MARKET CONTEXT says "insufficient data", set negotiate_to_lpa = null
     and say so in note.
8. story_prompts: 3 STAR scenarios. EACH "prompt" MUST name a SPECIFIC project
   from the CANDIDATE PROJECTS list above by its first 5–8 words. Do not
   write generic scenarios — if no project matches a requirement, set the
   prompt to "(no matching project on resume — add one before applying)".
   The "requirement" should be a verbatim phrase from must_have_skills.

CONSTRAINTS
- Do NOT penalize over-qualification. A 12-year veteran on a 5-8 year JD is
  FINE — call out level_read.band="over" but verdict can still be strong_fit.
- Do NOT invent skills the resume doesn't have.
- Do NOT invent compensation numbers — only use MARKET CONTEXT or JD posted band.
- Do NOT invent projects — only reference the CANDIDATE PROJECTS list.
- Stay under all character limits.
- If JD has zero must_have_skills, lean on jd_summary + role_function to judge.

Respond as JSON matching the schema. No prose.`;
}

export async function generateFitCard(input: FitCardInput): Promise<FitCard> {
  const text = await runWithRetry("light", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.25,
      },
    });
    return res.response.text();
  });

  const raw = JSON.parse(text) as Partial<FitCard>;

  // Validate verdict
  const validVerdicts: Verdict[] = ["strong_fit", "stretch", "underqualified", "mismatch", "off_target"];
  const verdict = validVerdicts.includes(raw.verdict as Verdict)
    ? (raw.verdict as Verdict)
    : "stretch";

  const validBands = ["under", "at", "over"] as const;
  const band = validBands.includes(raw.level_read?.band as typeof validBands[number])
    ? (raw.level_read!.band as "under" | "at" | "over")
    : "at";

  const truncate = (s: string | undefined, n: number) => (s ?? "").slice(0, n);

  return {
    verdict,
    one_liner:    truncate(raw.one_liner, 140),
    hard_blockers: (raw.hard_blockers ?? []).map((s) => truncate(s, 110)).slice(0, 5),
    soft_gaps:     (raw.soft_gaps     ?? []).map((s) => truncate(s, 110)).slice(0, 4),
    resume_tweaks: (raw.resume_tweaks ?? []).slice(0, 3).map((t, i) => ({
      priority:   ([1, 2, 3].includes(t.priority) ? t.priority : (i + 1)) as 1 | 2 | 3,
      suggestion: truncate(t.suggestion, 220),
      why:        truncate(t.why, 90),
    })),
    level_read: {
      band,
      note: truncate(raw.level_read?.note, 140),
    },
    comp_reality: {
      note: truncate(raw.comp_reality?.note, 160),
      negotiate_to_lpa:
        typeof raw.comp_reality?.negotiate_to_lpa === "number" && Number.isFinite(raw.comp_reality.negotiate_to_lpa)
          ? Math.round(raw.comp_reality.negotiate_to_lpa)
          : null,
    },
    story_prompts: (raw.story_prompts ?? []).slice(0, 3).map((s) => ({
      requirement: truncate(s.requirement, 60),
      prompt:      truncate(s.prompt, 140),
    })),
    // Sprint 3 Item 27/28 — surface the engine-supplied grounding so the UI
    // can show "from real market data" instead of "Gemini said so".
    market_comp: input.marketComp ?? null,
  };
}
