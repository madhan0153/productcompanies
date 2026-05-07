import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";

// Phase G — JD-side structured extraction.
// Run ONCE per job at ingest time (or via the backfill route). Cached on the
// row so all downstream scoring + Fit Card generation reads structured facts
// instead of regex'ing the description blob.
//
// Why this matters: regex over a hand-coded keyword list collapses
// "experience with X or Y; familiarity with Z is a plus" into [x, y, z] —
// must-haves and nice-to-haves indistinguishable. Scoring is downstream of
// signal quality; this is the load-bearing fix.

export interface ParsedJD {
  must_have_skills: string[];   // skills/tools the JD treats as required
  nice_to_have_skills: string[]; // "plus", "familiarity", "experience with X is a bonus"
  jd_min_years: number | null;
  jd_max_years: number | null;
  work_mode: "onsite" | "hybrid" | "remote" | null;
  jd_seniority_signal:
    | "intern" | "junior" | "mid" | "senior"
    | "staff" | "principal" | "lead" | "manager" | "director" | "vp"
    | null;
  /** ≤ 280 chars, what this role actually IS in plain English. Powers Fit Card header. */
  jd_summary: string;
  /** Ghost / boilerplate signals — flagged for downstream filtering. */
  is_boilerplate: boolean;
  ghost_reasons: string[];
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    must_have_skills:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    nice_to_have_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    jd_min_years:        { type: SchemaType.NUMBER },
    jd_max_years:        { type: SchemaType.NUMBER },
    work_mode:           { type: SchemaType.STRING },
    jd_seniority_signal: { type: SchemaType.STRING },
    jd_summary:          { type: SchemaType.STRING },
    is_boilerplate:      { type: SchemaType.BOOLEAN },
    ghost_reasons:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "must_have_skills", "nice_to_have_skills",
    "jd_summary", "is_boilerplate", "ghost_reasons",
  ],
};

const PROMPT = `You are an expert technical recruiter parsing a job description for an
India-focused engineering platform. Extract structured facts. Be ruthlessly
literal — do NOT invent requirements that aren't in the text.

DEFINITIONS
- must_have_skills: skills, tools, frameworks, or domains the JD presents as
  required. Phrases like "must have", "required", "expert in", "5+ years of X",
  or any skill listed without qualifying language. Canonical lower-case tokens
  (e.g. "react", "kafka", "postgres" — not "PostgreSQL 15+"). Max 12.
- nice_to_have_skills: anything qualified by "preferred", "a plus", "bonus",
  "familiarity with", "exposure to", "experience with X is desirable".
  Canonical lower-case. Max 8.
- jd_min_years / jd_max_years: integers (or one decimal). Read from phrases
  like "5-8 years", "5+ years", "minimum 3 years". Null if not stated.
- work_mode: 'onsite' | 'hybrid' | 'remote'. Look for "remote", "WFH",
  "hybrid", "in office", "in person". Null if not clearly stated.
- jd_seniority_signal: read from the title AND the body. Use ONLY: intern,
  junior, mid, senior, staff, principal, lead, manager, director, vp.
  "Senior" in the title → "senior". Multiple signals → use the highest.
- jd_summary: ONE sentence ≤ 280 chars. Plain English. What this role actually
  is. No marketing copy.
- is_boilerplate: true if the JD reads as a generic catch-all rather than a
  specific role (e.g. "Software Engineer - All Levels", obviously copy-pasted
  bullets, no concrete domain). Most ghost / evergreen postings read this way.
- ghost_reasons: short reasons for the boilerplate / ghost flag. Empty if not
  flagged. Examples: "no concrete tech stack", "title is a level range",
  "duplicate phrasing across sections".

CONSTRAINTS
- If the JD doesn't list a tech, do not invent one.
- If you can't find a number, return null. Do not guess.
- Skills are LOWERCASE single tokens or two-word phrases ("react native"),
  not sentences.

Return ONLY the JSON. No prose.`;

export async function parseJobDescription(input: {
  title: string;
  description: string;
  seniority_hint?: string | null;
}): Promise<ParsedJD> {
  const prompt = `${PROMPT}

JOB TITLE: ${input.title}
SENIORITY HINT (from crawler): ${input.seniority_hint ?? "unknown"}
JOB DESCRIPTION:
${input.description.slice(0, 6000)}`;

  const text = await runWithRetry("light", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.05,
      },
    });
    return res.response.text();
  });

  const raw = JSON.parse(text) as Partial<ParsedJD>;

  const lc = (s: unknown): string =>
    String(s ?? "").trim().toLowerCase();

  const dedupLowercase = (arr: unknown[] | undefined, max: number): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of arr ?? []) {
      const k = lc(t);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      if (out.length >= max) break;
    }
    return out;
  };

  const validSeniorities = new Set([
    "intern", "junior", "mid", "senior",
    "staff", "principal", "lead", "manager", "director", "vp",
  ]);
  const seniority = lc(raw.jd_seniority_signal);
  const seniorityOut = validSeniorities.has(seniority)
    ? (seniority as ParsedJD["jd_seniority_signal"])
    : null;

  const workMode = lc(raw.work_mode);
  const workModeOut = workMode === "onsite" || workMode === "hybrid" || workMode === "remote"
    ? workMode
    : null;

  const num = (n: unknown): number | null => {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 50) return null;
    return Math.round(n * 10) / 10;
  };

  return {
    must_have_skills:    dedupLowercase(raw.must_have_skills, 12),
    nice_to_have_skills: dedupLowercase(raw.nice_to_have_skills, 8),
    jd_min_years:        num(raw.jd_min_years),
    jd_max_years:        num(raw.jd_max_years),
    work_mode:           workModeOut,
    jd_seniority_signal: seniorityOut,
    jd_summary:          (raw.jd_summary ?? "").slice(0, 280),
    is_boilerplate:      Boolean(raw.is_boilerplate),
    ghost_reasons:       dedupLowercase(raw.ghost_reasons, 5),
  };
}
