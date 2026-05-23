import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";

export interface CoachPlanWeek {
  week_range: string;   // e.g. "Weeks 1–2"
  theme: string;        // short title
  focus: string[];      // bullets, max 3
  deliverable: string;  // single concrete artefact
}

export interface CoachPlan {
  headline: string;          // one-line summary
  thesis: string;            // 2-sentence rationale tied to user gaps + market
  priority_skills: Array<{ skill: string; why: string }>;  // top 3
  ninety_day_plan: CoachPlanWeek[]; // 4–5 phases covering 0–90 days
  resume_tweaks: string[];          // 3 short concrete edits
  target_companies: Array<{ company: string; reason: string }>; // top 3
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    thesis: { type: SchemaType.STRING },
    priority_skills: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          skill: { type: SchemaType.STRING },
          why: { type: SchemaType.STRING },
        },
        required: ["skill", "why"],
      },
    },
    ninety_day_plan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week_range: { type: SchemaType.STRING },
          theme: { type: SchemaType.STRING },
          focus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          deliverable: { type: SchemaType.STRING },
        },
        required: ["week_range", "theme", "focus", "deliverable"],
      },
    },
    resume_tweaks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    target_companies: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
        },
        required: ["company", "reason"],
      },
    },
  },
  required: [
    "headline", "thesis", "priority_skills",
    "ninety_day_plan", "resume_tweaks", "target_companies",
  ],
};

export interface CoachContext {
  seniority: string | null;
  target_lpa: number | null;
  current_lpa: number | null;
  years_experience: number | null;
  user_stack: string[];
  top_gaps: Array<{ label: string; jobs: number }>;
  adjacency: Array<{ label: string; unlocked: number }>;
  hot_hubs: string[];
  total_active_roles: number;
  approved_companies: string[]; // names of the 51 approved product companies
}

function buildPrompt(ctx: CoachContext): string {
  return `You are a senior engineering career coach for Indian software engineers
targeting product-company roles (FAANG + leading Indian product companies).

CANDIDATE
- Seniority: ${ctx.seniority ?? "not specified"}
- Years of experience: ${ctx.years_experience ?? "?"}
- Current package: ${ctx.current_lpa ? `₹${ctx.current_lpa} LPA` : "not specified"}
- Target package: ${ctx.target_lpa ? `₹${ctx.target_lpa} LPA` : "not specified"}
- Stack (top 12): ${ctx.user_stack.slice(0, 12).join(", ")}

LIVE MARKET (${ctx.total_active_roles} active roles on official career pages)
- Top gaps you don't cover: ${ctx.top_gaps.slice(0, 6).map((g) => `${g.label} (${g.jobs} roles)`).join(", ")}
- High-leverage adjacencies: ${ctx.adjacency.slice(0, 5).map((a) => `${a.label} unlocks ${a.unlocked} roles`).join(", ")}
- Hot hubs: ${ctx.hot_hubs.join(", ")}

CONSTRAINTS
- Recommend ONLY companies from this approved list: ${ctx.approved_companies.join(", ")}.
- Compensation must be referenced in LPA.
- Plan is exactly 90 days, broken into 4–5 phases that ladder up to a real, shippable deliverable.
- Be concrete. No platitudes. No "consider learning" — say what to build.

Respond as JSON matching the schema. Keep every string under 30 words.`;
}

export async function generateCoachPlan(ctx: CoachContext): Promise<CoachPlan> {
  const text = await runWithRetry("light", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(ctx) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.4,
      },
    });
    return res.response.text();
  }, { operation: "coach_plan" });

  const raw = JSON.parse(text) as CoachPlan;
  return {
    headline: raw.headline,
    thesis: raw.thesis,
    priority_skills: (raw.priority_skills ?? []).slice(0, 3),
    ninety_day_plan: (raw.ninety_day_plan ?? []).slice(0, 5),
    resume_tweaks: (raw.resume_tweaks ?? []).slice(0, 3),
    target_companies: (raw.target_companies ?? []).slice(0, 3),
  };
}
