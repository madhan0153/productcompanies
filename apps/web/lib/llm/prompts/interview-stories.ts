// Interview Lab — Story Bank LLM prompts.
//
// PROBLEM: Indian IT services engineers freeze on behavioral rounds because
// they've never built a library of STAR stories — they panic-improvise. This
// module reads their parsed resume + extracted bullet content and generates
// 8-10 polished STAR stories distributed across competencies that product
// company behavioral interviews probe for.
//
// PRIVACY: input contains resume_pii (declared in operations.ts); generated
// stories are owner-scoped via RLS. Never logged.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { parseJsonObject } from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export const STORY_COMPETENCIES = [
  "leadership",
  "ownership",
  "conflict",
  "scope_change",
  "technical_depth",
  "business_impact",
  "failure_learning",
  "mentorship",
  "ambiguity",
  "cross_functional",
] as const;
export type StoryCompetency = (typeof STORY_COMPETENCIES)[number];

export interface GeneratedStory {
  competency: StoryCompetency;
  /** Short imperative title — "Cut order-pipeline latency by 60%" */
  title: string;
  /** 2-3 sentences: business / technical context. */
  situation: string;
  /** 1-2 sentences: the specific task the candidate owned. */
  task: string;
  /** 3-5 sentences: what they did, active voice, strong verbs. */
  action: string;
  /** 1-2 sentences: outcome — quantified when source resume has numbers,
   *  otherwise qualitative. NEVER invented. */
  result: string;
  /** Company in the candidate's resume this story comes from. */
  source_company: string;
  source_role: string;
  /** 2-3 behavioral interview questions this story answers. */
  suggested_questions: string[];
}

const STORY_SCHEMA_ITEM: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    competency:          { type: SchemaType.STRING },
    title:               { type: SchemaType.STRING },
    situation:           { type: SchemaType.STRING },
    task:                { type: SchemaType.STRING },
    action:              { type: SchemaType.STRING },
    result:              { type: SchemaType.STRING },
    source_company:      { type: SchemaType.STRING },
    source_role:         { type: SchemaType.STRING },
    suggested_questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "competency", "title", "situation", "task", "action", "result",
    "source_company", "source_role", "suggested_questions",
  ],
};

const GENERATE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    stories: { type: SchemaType.ARRAY, items: STORY_SCHEMA_ITEM },
  },
  required: ["stories"],
};

const GENERATE_PROMPT = `You are an interview-prep coach who has helped 1,000+ Indian engineers
move from IT services companies (TCS / Infosys / Wipro / Accenture / etc.)
to product companies (Google / Microsoft / Razorpay / Flipkart / etc.).

Your job: from this candidate's parsed resume and extracted experience
bullets, write 8-10 strong STAR stories suitable for behavioral interview
rounds at top product companies.

INVARIANTS (do not break):
1. Every story MUST be derivable from the candidate's actual companies,
   roles, products_built, summary, and extracted bullets. NEVER invent
   companies, technologies, metrics, or people that aren't in the source.
2. If the source resume has numbers (latency, throughput, $$, percentage),
   USE THEM. If not, use qualitative phrasing ("significantly improved",
   "owned end-to-end") — never invent numbers.
3. source_company MUST match one of the candidate's actual companies from
   the resume.
4. Stories should DISTRIBUTE across competencies. Don't generate 5
   "leadership" stories — aim for variety across the taxonomy. The right
   mix usually includes at least one each of: ownership, technical_depth,
   business_impact, cross_functional, plus 2-3 stretch competencies the
   candidate's resume supports (failure_learning, conflict, ambiguity,
   mentorship, scope_change, leadership).
5. Tone: first person; confident but factual; product-company register
   ("owned", "shipped", "scaled to", "drove" — not "was responsible for",
   "helped with", "involved in").
6. Title: 4-8 words, imperative or noun-phrase, focused on outcome.
7. result: tie back to a measurable or visible business impact.
8. suggested_questions: 2-3 real behavioral interview prompts this story
   answers. Use Indian product company phrasing where appropriate
   ("Tell me about a time when…", "Describe a project where…").

COMPETENCY TAXONOMY (use EXACTLY one of these strings for each story):
- leadership: led people, influenced without authority, mentored team
- ownership: owned end-to-end, drove decisions, escalated when stuck
- conflict: disagreed with a peer / manager / partner team; resolved
- scope_change: requirements moved; replanned and shipped
- technical_depth: deep dive into a hard technical problem, made trade-off
- business_impact: directly moved revenue / cost / customer metric
- failure_learning: something failed; you took responsibility; lessons
- mentorship: grew someone else; codified knowledge
- ambiguity: started with vague ask; defined scope; shipped
- cross_functional: worked with product / design / data / business

Return ONLY a JSON object with a "stories" array. No prose around it.`;

const POLISH_PROMPT = `You are an interview-prep coach polishing ONE STAR story for an Indian
engineer interviewing at a top product company. The user has edited the
fields. Tighten the prose without changing the facts.

INVARIANTS:
- NEVER invent metrics, companies, or technologies. If the user removed a
  metric, do not add it back.
- Keep total length similar to input.
- Active voice, strong verbs, first person.
- result must remain tied to a measurable or visible outcome.

Return ONLY the JSON object for the polished story.`;

/**
 * Build the source text shown to the LLM. Combines the structured fields
 * from ParsedResume + (optionally) the verbatim bullets from extracted
 * content. The extracted content gives the prompt enough raw material to
 * write specific stories instead of generic ones.
 */
function buildSourceText(
  parsed: ParsedResume,
  extractedBullets: string[] | undefined,
): string {
  const lines: string[] = [];
  lines.push(`Name: ${parsed.name}`);
  lines.push(`Current role: ${parsed.current_role}`);
  lines.push(`Primary function: ${parsed.role_function}`);
  lines.push(`Years of experience: ${parsed.total_years_experience}`);
  if (parsed.summary) lines.push(`\nProfessional summary:\n${parsed.summary}`);
  if (parsed.tech_stack.length > 0) {
    lines.push(`\nTech stack: ${parsed.tech_stack.slice(0, 40).join(", ")}`);
  }
  if (parsed.companies.length > 0) {
    lines.push(`\nCompanies (recent first):`);
    for (const c of parsed.companies) {
      lines.push(`- ${c.role} at ${c.name} (${c.years} years, ${c.is_product_company ? "product co" : "services co"})`);
    }
  }
  if (parsed.products_built.length > 0) {
    lines.push(`\nProducts / projects built:`);
    for (const p of parsed.products_built.slice(0, 12)) lines.push(`- ${p}`);
  }
  if (extractedBullets && extractedBullets.length > 0) {
    lines.push(`\nVerbatim bullets from the candidate's resume:`);
    for (const b of extractedBullets.slice(0, 60)) lines.push(`• ${b}`);
  }
  return lines.join("\n");
}

export async function generateInterviewStories(input: {
  parsed: ParsedResume;
  extractedBullets?: string[];
}): Promise<GeneratedStory[]> {
  const source = buildSourceText(input.parsed, input.extractedBullets);

  const text = await runWithRetry("heavy", async (model) => {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${GENERATE_PROMPT}\n\n=== CANDIDATE SOURCE ===\n${source}` }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GENERATE_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 6000,
      },
    });
    return result.response.text();
  }, { operation: "interview_story_generate" });

  const parsed = parseJsonObject<{ stories?: GeneratedStory[] }>(text);
  return sanitiseStories(parsed.stories ?? []);
}

export async function polishInterviewStory(story: GeneratedStory): Promise<GeneratedStory> {
  const text = await runWithRetry("light", async (model) => {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${POLISH_PROMPT}\n\n=== STORY ===\n${JSON.stringify(story)}` }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: STORY_SCHEMA_ITEM,
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
    });
    return result.response.text();
  }, { operation: "interview_story_polish" });

  return sanitiseStory(parseJsonObject<GeneratedStory>(text));
}

// ── Sanitisation ──────────────────────────────────────────────────────────
//
// LLMs occasionally drop in unknown competency strings or leave bullets in
// the action field. Pure-TS cleanup is safer than schema-only validation.

const COMPETENCY_SET = new Set<string>(STORY_COMPETENCIES);

function sanitiseStory(s: GeneratedStory): GeneratedStory {
  const competency: StoryCompetency = COMPETENCY_SET.has(s.competency)
    ? (s.competency as StoryCompetency)
    : "ownership";
  return {
    competency,
    title:               (s.title ?? "").trim(),
    situation:           (s.situation ?? "").trim(),
    task:                (s.task ?? "").trim(),
    action:              (s.action ?? "").trim(),
    result:              (s.result ?? "").trim(),
    source_company:      (s.source_company ?? "").trim(),
    source_role:         (s.source_role ?? "").trim(),
    suggested_questions: (s.suggested_questions ?? [])
      .map((q) => q.trim())
      .filter((q) => q.length > 6)
      .slice(0, 3),
  };
}

function sanitiseStories(stories: GeneratedStory[]): GeneratedStory[] {
  return stories
    .map(sanitiseStory)
    .filter((s) => s.title.length > 4 && s.situation.length > 20 && s.action.length > 20);
}
