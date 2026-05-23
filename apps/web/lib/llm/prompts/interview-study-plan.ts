// Interview Lab — personalised study plan generator.
//
// Inputs: candidate's parsed resume + readiness scores (4 dimensions) +
// target companies + weeks (4/6/8/12).
// Output: a week-by-week plan with daily tasks (DSA / story rehearsal /
// system design / mock interview), each tagged with a focus area so the
// UI can render check-offs against the day_progress table.
//
// DETERMINISTIC FALLBACK: when every LLM provider is exhausted, we still
// return a sensible plan from the readiness scores + standard weekly mix.
// The plan won't be as personalised but the daily check-off mechanic still
// works.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { parseJsonObject } from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export interface StudyPlanInput {
  parsed: ParsedResume;
  readiness: {
    dsa_score: number;
    system_design_score: number;
    behavioral_score: number;
    domain_score: number;
  } | null;
  weeks: 4 | 6 | 8 | 12;
  target_companies: string[];
  target_role_function: string;
}

export type StudyTaskKind =
  | "dsa"
  | "story_rehearsal"
  | "system_design"
  | "mock_interview"
  | "cheatsheet_read"
  | "rest"
  | "project_translate";

export interface StudyTask {
  kind: StudyTaskKind;
  /** Short imperative — "Solve 2 medium hashmap problems on LeetCode" */
  headline: string;
  /** Why this task today, anchored to resume / readiness signal. */
  why: string;
  /** Estimated minutes — keeps the day honest. */
  estimated_minutes: number;
}

export interface StudyDay {
  /** 1-indexed day of the plan (1..N where N = weeks * 7). */
  day_index: number;
  /** "Mon" / "Tue" / "Wed" / "Thu" / "Fri" / "Sat" / "Sun". Derived for UX. */
  weekday: string;
  tasks: StudyTask[];
  /** Short morale prompt; ~1 sentence. */
  focus: string;
}

export interface StudyWeek {
  week_index: number; // 1-indexed
  theme: string;       // "Arrays & Strings warm-up", "System design fundamentals"
  days: StudyDay[];
}

export interface StudyPlan {
  weeks: StudyWeek[];
  /** Concise overall plan summary the UI shows above week 1. */
  overview: string;
  /** 3-5 bullets the user should keep visible. */
  daily_principles: string[];
  is_fallback: boolean;
}

const TASK_KIND_SET = new Set<StudyTaskKind>([
  "dsa", "story_rehearsal", "system_design", "mock_interview", "cheatsheet_read", "rest", "project_translate",
]);

const TASK_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    kind:              { type: SchemaType.STRING },
    headline:          { type: SchemaType.STRING },
    why:               { type: SchemaType.STRING },
    estimated_minutes: { type: SchemaType.NUMBER },
  },
  required: ["kind", "headline", "why", "estimated_minutes"],
};

const DAY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    day_index: { type: SchemaType.NUMBER },
    weekday:   { type: SchemaType.STRING },
    tasks:     { type: SchemaType.ARRAY, items: TASK_SCHEMA },
    focus:     { type: SchemaType.STRING },
  },
  required: ["day_index", "weekday", "tasks", "focus"],
};

const WEEK_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    week_index: { type: SchemaType.NUMBER },
    theme:      { type: SchemaType.STRING },
    days:       { type: SchemaType.ARRAY, items: DAY_SCHEMA },
  },
  required: ["week_index", "theme", "days"],
};

const PLAN_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overview:         { type: SchemaType.STRING },
    daily_principles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    weeks:            { type: SchemaType.ARRAY, items: WEEK_SCHEMA },
  },
  required: ["overview", "daily_principles", "weeks"],
};

const PROMPT = `You are an interview-prep coach building a personalised, day-by-day
study plan for an Indian engineer preparing for product-company interviews.

INVARIANTS:
1. Total days = weeks × 7. Output EVERY day; do not skip weekends.
2. Day 7, 14, 21, ... should be lighter (rest or 1 mock interview).
3. Mix tasks across dimensions guided by readiness scores: lowest score
   gets more frequency.
4. Anchor "why" sentences to a specific signal in the candidate's resume
   or readiness (e.g. "your DSA score is 42 — arrays/hashmap repetition
   builds the most points fastest").
5. Task estimated_minutes: 30-120 typical; total per day should sit
   between 60 and 180 minutes (be realistic for someone holding a day job).
6. Headlines are concrete: name the topic, the company if relevant, the
   resource ("LeetCode hashmap easy", "Razorpay system design write-up
   on idempotency").
7. Output JSON only; no prose around it.

TASK KIND TAXONOMY:
- dsa                : a coding problem set
- story_rehearsal    : pull a story from Story Bank, rehearse out loud
- system_design      : study or solve a system-design exercise
- mock_interview     : run a focused mock (after Story Bank is built)
- cheatsheet_read    : read a company × round cheatsheet
- rest               : intentional recovery day
- project_translate  : use the Project Translator on a resume bullet

Return ONLY the JSON object.`;

export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlan> {
  const source = buildSourceText(input);
  try {
    const text = await runWithRetry("heavy", async (model) => {
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: `${PROMPT}\n\n=== INPUT ===\n${source}` }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PLAN_SCHEMA,
          temperature: 0.3,
          maxOutputTokens: 8000,
        },
      });
      return result.response.text();
    }, { operation: "interview_study_plan_generate" });

    const parsed = parseJsonObject<StudyPlan>(text);
    return sanitisePlan(parsed, input.weeks, false);
  } catch {
    return deterministicStudyPlan(input);
  }
}

// ── Deterministic fallback ────────────────────────────────────────────────
//
// Produces a sane week-by-week plan from the readiness scores. Lower scores
// get more frequency. Same JSON shape so downstream UI doesn't branch.

function deterministicStudyPlan(input: StudyPlanInput): StudyPlan {
  const r = input.readiness ?? { dsa_score: 50, system_design_score: 50, behavioral_score: 50, domain_score: 50 };
  const weeks: StudyWeek[] = [];
  const themes = [
    "Foundation week — arrays, hashing, two pointers",
    "Trees, recursion, binary search",
    "Stacks, queues, sliding window",
    "Graphs + dynamic programming basics",
    "Behavioral rehearsal + system design fundamentals",
    "Mock interview week — lower DSA volume",
    "Hard DSA + advanced system design",
    "Company-specific cheatsheets",
    "Mixed-tier DSA + mock cadence",
    "Behavioral + negotiation prep",
    "Active interviewing — light reps",
    "Offer week — keep the rust off",
  ];
  for (let w = 1; w <= input.weeks; w++) {
    const days: StudyDay[] = [];
    for (let d = 1; d <= 7; d++) {
      const dayIdx = (w - 1) * 7 + d;
      days.push({
        day_index: dayIdx,
        weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIdx % 7],
        tasks: deterministicTasksForDay(d, r),
        focus: focusForDay(d, w, r),
      });
    }
    weeks.push({
      week_index: w,
      theme: themes[(w - 1) % themes.length],
      days,
    });
  }
  return {
    overview:
      `A ${input.weeks}-week plan focused on lifting your lowest readiness dimensions first. ` +
      `Lowest score: ${lowestDim(r)}. Each day blends a primary task with a smaller cross-task.`,
    daily_principles: [
      "Solve before you read solutions.",
      "Rehearse one Story Bank story out loud daily.",
      "Time-box: 90 minutes is a great day, 30 minutes is a fine day.",
      "Skip a day rather than rush — rust accumulates, but burnout costs more.",
    ],
    weeks,
    is_fallback: true,
  };
}

function deterministicTasksForDay(d: number, r: { dsa_score: number; system_design_score: number; behavioral_score: number; domain_score: number }): StudyTask[] {
  // Day 7 — rest / mock day.
  if (d === 7) {
    return [{
      kind: "mock_interview",
      headline: "30-min mock interview — pick any dimension you feel rusty in",
      why: "Weekly mocks fix the gap between knowing a topic and performing under pressure.",
      estimated_minutes: 30,
    }];
  }
  const primary: StudyTask =
    r.dsa_score <= r.system_design_score && r.dsa_score <= r.behavioral_score
      ? { kind: "dsa", headline: "Solve 1 medium + 1 easy LeetCode problem", why: `Your DSA score is ${r.dsa_score}; daily repetition is the fastest lift.`, estimated_minutes: 60 }
      : r.system_design_score <= r.behavioral_score
        ? { kind: "system_design", headline: "Study one system-design topic (CAP, sharding, or idempotency)", why: `System Design score is ${r.system_design_score}; foundations come first.`, estimated_minutes: 60 }
        : { kind: "story_rehearsal", headline: "Rehearse 2 STAR stories from Story Bank out loud", why: `Behavioral score is ${r.behavioral_score}; rehearsal cements pacing.`, estimated_minutes: 30 };
  const secondary: StudyTask = (d % 2 === 0)
    ? { kind: "story_rehearsal", headline: "Skim a Story Bank story; do not over-edit", why: "Daily exposure beats weekly intensives for retention.", estimated_minutes: 15 }
    : { kind: "cheatsheet_read", headline: "Read one company × round cheatsheet", why: "Calibrate expectations to a real bar.", estimated_minutes: 20 };
  return [primary, secondary];
}

function focusForDay(d: number, w: number, r: { dsa_score: number; system_design_score: number; behavioral_score: number; domain_score: number }): string {
  if (d === 7) return `End of week ${w}: one mock, no new topics. Recover.`;
  const low = lowestDim(r);
  return `Today's lift: ${low}. Small, deliberate progress beats a 4-hour push.`;
}

function lowestDim(r: { dsa_score: number; system_design_score: number; behavioral_score: number; domain_score: number }): string {
  const dims = [
    { name: "DSA",            v: r.dsa_score },
    { name: "System Design",  v: r.system_design_score },
    { name: "Behavioral",     v: r.behavioral_score },
    { name: "Domain",         v: r.domain_score },
  ];
  dims.sort((a, b) => a.v - b.v);
  return dims[0].name;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildSourceText(input: StudyPlanInput): string {
  const lines: string[] = [];
  lines.push(`Weeks: ${input.weeks}`);
  lines.push(`Target role function: ${input.target_role_function}`);
  lines.push(`Target companies: ${input.target_companies.join(", ") || "any of the 51 approved"}`);
  if (input.readiness) {
    lines.push(`Readiness scores: DSA=${input.readiness.dsa_score}, SD=${input.readiness.system_design_score}, Behavioral=${input.readiness.behavioral_score}, Domain=${input.readiness.domain_score}`);
  } else {
    lines.push(`Readiness: not yet assessed`);
  }
  lines.push(`Years of experience: ${input.parsed.total_years_experience}`);
  lines.push(`Primary function: ${input.parsed.role_function}`);
  if (input.parsed.tech_stack.length > 0) {
    lines.push(`Tech stack: ${input.parsed.tech_stack.slice(0, 30).join(", ")}`);
  }
  if (input.parsed.companies.length > 0) {
    lines.push(`Companies: ${input.parsed.companies.map((c) => `${c.role} at ${c.name} (${c.years}y)`).join("; ")}`);
  }
  return lines.join("\n");
}

function sanitisePlan(p: StudyPlan, weeks: number, isFallback: boolean): StudyPlan {
  const sanitisedWeeks: StudyWeek[] = [];
  let dayCounter = 0;
  for (let w = 1; w <= weeks; w++) {
    const week = p.weeks?.[w - 1];
    const days: StudyDay[] = [];
    for (let d = 1; d <= 7; d++) {
      dayCounter++;
      const day = week?.days?.[d - 1];
      const tasks = (day?.tasks ?? []).map(sanitiseTask).filter((t): t is StudyTask => t !== null);
      days.push({
        day_index: dayCounter,
        weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayCounter % 7],
        tasks: tasks.length > 0 ? tasks.slice(0, 4) : [
          { kind: "dsa", headline: "Solve 1 problem at any difficulty.", why: "Daily repetition.", estimated_minutes: 30 },
        ],
        focus: (day?.focus ?? "").trim() || "Small, deliberate progress.",
      });
    }
    sanitisedWeeks.push({
      week_index: w,
      theme: (week?.theme ?? `Week ${w}`).trim(),
      days,
    });
  }
  return {
    overview: (p.overview ?? "").trim() || "Personalised plan.",
    daily_principles: (p.daily_principles ?? []).filter((s) => s && s.trim().length > 5).slice(0, 6),
    weeks: sanitisedWeeks,
    is_fallback: isFallback,
  };
}

function sanitiseTask(t: StudyTask): StudyTask | null {
  if (!t || !TASK_KIND_SET.has(t.kind)) return null;
  const headline = (t.headline ?? "").trim();
  if (headline.length < 4) return null;
  return {
    kind: t.kind,
    headline,
    why: (t.why ?? "").trim(),
    estimated_minutes: Math.max(5, Math.min(180, Math.round(t.estimated_minutes ?? 30))),
  };
}
