// Sprint 5 — Feature 34c. Negotiation memo generator.
//
// Personalised playbook for negotiating ONE specific role × company offer.
// Anchors the recommended ask on the same market_comp percentiles that
// power the Fit Card (Sprint 3 Item 28) — no hallucinated comp numbers.
//
// Output sections:
//   - executive_summary       — TL;DR for the candidate (3 sentences)
//   - market_anchor           — verbatim restatement of the percentile data
//                               so the user can quote it in conversation
//   - target_offer            — the specific ask (base + variable + ESOP + bonus)
//   - talking_points          — 3-5 leverage points specific to THIS candidate
//   - counter_offer_email     — paste-ready email body for the initial ask
//   - response_email          — paste-ready response when recruiter pushes back
//   - walkaway_threshold      — number + one-line rationale
//   - esop_vs_cash            — practical guidance on the trade-off
//   - risk_flags              — what could go wrong (low-ball, exploding offer…)
//
// Strict no-fabrication rules in the prompt — see the CONSTRAINTS section.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";
import type { CompBracket } from "@/lib/insights/comp-percentiles";

export interface NegotiationMemoContent {
  executive_summary: string;
  market_anchor: {
    note: string;                  // "Market p75 for senior backend at India product cos: ₹X LPA (n=Y postings)"
    median_lpa: number | null;
    p75_lpa: number | null;
    p90_lpa: number | null;
    sample_size: number | null;
  };
  target_offer: {
    base_lpa: number | null;
    variable_lpa: number | null;
    esop_value_lpa: number | null;
    joining_bonus_lpa: number | null;
    total_lpa: number | null;
    rationale: string;             // 1-2 sentences
  };
  talking_points: string[];        // 3-5 items, each ≤ 240 chars
  counter_offer_email: {
    subject: string;
    body: string;                  // ≤ 1200 chars; paste-ready
  };
  response_email: {
    subject: string;
    body: string;                  // ≤ 1200 chars
  };
  walkaway_threshold: {
    lpa: number | null;
    rationale: string;             // ≤ 240 chars
  };
  esop_vs_cash: string;            // ≤ 600 chars — practical India-tax-aware guidance
  risk_flags: string[];            // 2-4 items, each ≤ 180 chars
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    executive_summary: { type: SchemaType.STRING },
    market_anchor: {
      type: SchemaType.OBJECT,
      properties: {
        note:        { type: SchemaType.STRING },
        median_lpa:  { type: SchemaType.NUMBER },
        p75_lpa:     { type: SchemaType.NUMBER },
        p90_lpa:     { type: SchemaType.NUMBER },
        sample_size: { type: SchemaType.NUMBER },
      },
      required: ["note"],
    },
    target_offer: {
      type: SchemaType.OBJECT,
      properties: {
        base_lpa:          { type: SchemaType.NUMBER },
        variable_lpa:      { type: SchemaType.NUMBER },
        esop_value_lpa:    { type: SchemaType.NUMBER },
        joining_bonus_lpa: { type: SchemaType.NUMBER },
        total_lpa:         { type: SchemaType.NUMBER },
        rationale:         { type: SchemaType.STRING },
      },
      required: ["rationale"],
    },
    talking_points: {
      type: SchemaType.ARRAY, items: { type: SchemaType.STRING },
    },
    counter_offer_email: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING },
        body:    { type: SchemaType.STRING },
      },
      required: ["subject", "body"],
    },
    response_email: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING },
        body:    { type: SchemaType.STRING },
      },
      required: ["subject", "body"],
    },
    walkaway_threshold: {
      type: SchemaType.OBJECT,
      properties: {
        lpa:       { type: SchemaType.NUMBER },
        rationale: { type: SchemaType.STRING },
      },
      required: ["rationale"],
    },
    esop_vs_cash: { type: SchemaType.STRING },
    risk_flags:   { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: [
    "executive_summary", "market_anchor", "target_offer", "talking_points",
    "counter_offer_email", "response_email", "walkaway_threshold",
    "esop_vs_cash", "risk_flags",
  ],
};

export interface NegotiationMemoInput {
  resume: ParsedResume;
  candidate_name: string;
  current_lpa: number | null;
  target_lpa: number | null;
  years_experience: number | null;
  job: {
    title: string;
    company: string;
    location: string;
    seniority: string | null;
    role_function: string | null;
    comp_lpa_min: number | null;
    comp_lpa_max: number | null;
  };
  jd_summary: string | null;
  /** Grounded market bracket — passed verbatim into the prompt and stamped
   *  on the resulting market_anchor block. */
  market_comp: CompBracket | null;
}

function buildPrompt(x: NegotiationMemoInput): string {
  const jdComp = x.job.comp_lpa_min || x.job.comp_lpa_max
    ? `${x.job.comp_lpa_min ?? "?"}–${x.job.comp_lpa_max ?? "?"} LPA`
    : "not disclosed";

  const mc = x.market_comp;
  const marketBlock = mc
    ? `Market data for ${mc.seniority}${mc.role_function ? ` ${mc.role_function}` : ""} ` +
      `(n=${mc.n} active postings, basis=${mc.basis}):\n` +
      `  - median ${mc.median} LPA\n  - p75 ${mc.p75} LPA\n  - p90 ${mc.p90} LPA`
    : `Market data: insufficient active postings for ${x.job.seniority ?? "this band"} × ${x.job.role_function ?? "this function"}. ` +
      `Set target_offer numbers to null and explain the data gap in target_offer.rationale.`;

  const recentCompany = (x.resume.companies ?? [])[0];
  const isProductCo = recentCompany?.is_product_company;

  return `You are an India-based engineering compensation consultant who has
negotiated 500+ product-co offers. Produce a Negotiation Memo this
candidate can use TODAY for one specific role × company.

CANDIDATE
- Name: ${x.candidate_name}
- Years of paid experience: ${x.years_experience ?? "?"}
- Current LPA: ${x.current_lpa ?? "?"}  |  Target LPA: ${x.target_lpa ?? "?"}
- Most recent: ${recentCompany?.name ?? "?"} as ${recentCompany?.role ?? "?"} (${recentCompany?.years ?? "?"} yrs)
  Product company: ${isProductCo ? "yes" : "no/unknown"}
- Tech stack: ${x.resume.tech_stack.slice(0, 15).join(", ")}
- One-line summary: ${(x.resume.summary ?? "").slice(0, 200)}

ROLE BEING NEGOTIATED
- ${x.job.title} at ${x.job.company} (${x.job.location})
- Seniority: ${x.job.seniority ?? "?"}  |  Function: ${x.job.role_function ?? "?"}
- Posted compensation: ${jdComp}
- JD summary: ${x.jd_summary ?? ""}

MARKET CONTEXT (anchor every comp number on this — never invent percentiles)
${marketBlock}

PRODUCE
1. executive_summary (≤480 chars, 3 sentences max). Plain English: should
   they negotiate, by roughly how much, and what's the strongest lever.
2. market_anchor: restate the MARKET CONTEXT numbers verbatim into the
   schema fields (median_lpa, p75_lpa, p90_lpa, sample_size). The 'note'
   text is what the candidate will quote in conversation — make it short
   and citable.
3. target_offer: a single coherent ask.
   - Anchor base_lpa on JD comp_lpa_max or market p75 (whichever is HIGHER
     when JD comp is posted; market p75 when JD comp is not posted).
   - variable_lpa: typical 10-15% of base for product cos in India;
     return null if not commonly disclosed by the company.
   - esop_value_lpa: estimate fairly when company is known to offer ESOPs;
     null when it isn't (most Indian unicorn product cos do; mid-size SaaS
     ones often don't).
   - joining_bonus_lpa: only when the data plausibly supports asking for
     one (e.g., candidate has competing offer or notice-period buyout).
   - total_lpa: sum of the above components.
   - rationale: 1-2 sentences explaining how you assembled the number.
4. talking_points: 3-5 strongest leverage points THIS candidate has.
   Mention concrete resume signals (years at product co X, ownership of
   project Y, modern stack overlap). NEVER invent achievements.
5. counter_offer_email: paste-ready email body (≤1200 chars) sent AFTER
   the initial offer arrives. Asks for the target_offer. Indian English,
   no Oxford comma fetish, professional but not stuffy.
6. response_email: paste-ready reply if the recruiter pushes back with a
   smaller bump. Asks for one specific concession (bonus, ESOP refresh,
   variable structure change) without rejecting the offer.
7. walkaway_threshold: the lowest LPA they should accept and why. This is
   often current_lpa × 1.3 unless market p75 is lower — pick the higher
   of the two and explain.
8. esop_vs_cash (≤600 chars): India-tax-aware guidance — vesting cliff,
   liquidity reality, capital gains, when to ask for cash instead.
9. risk_flags: 2-4 things that could go wrong. e.g.,
   "company X has a reputation for exploding offers", "JD listed comp_lpa_max
   ${x.job.comp_lpa_max ?? "?"} — market p90 is higher, so they may already
   be undercutting", etc. Be specific.

NON-NEGOTIABLE RULES
- NEVER fabricate market percentiles. Only use MARKET CONTEXT numbers.
- NEVER invent the candidate's competing offers, prior comp, or
  achievements not present in CANDIDATE above.
- NEVER tell the candidate to lie or misrepresent. Memos are based on
  factual leverage.
- If the candidate's current_lpa or target_lpa is null/unknown, say so in
  the relevant section and provide a market-anchored alternative.

Respond as JSON matching the schema. No prose outside the JSON.`;
}

export async function generateNegotiationMemo(input: NegotiationMemoInput): Promise<NegotiationMemoContent> {
  const text = await runWithRetry("heavy", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.25,
        maxOutputTokens: 4096,
      },
    });
    return res.response.text();
  }, { operation: "negotiation_memo" });

  const raw = JSON.parse(text) as NegotiationMemoContent;
  const trunc = (s: string | undefined, n: number) => (s ?? "").slice(0, n);
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 10) / 10 : null);

  return {
    executive_summary: trunc(raw.executive_summary, 480),
    market_anchor: {
      note:        trunc(raw.market_anchor?.note, 240),
      median_lpa:  num(raw.market_anchor?.median_lpa),
      p75_lpa:     num(raw.market_anchor?.p75_lpa),
      p90_lpa:     num(raw.market_anchor?.p90_lpa),
      sample_size: typeof raw.market_anchor?.sample_size === "number"
        ? Math.round(raw.market_anchor.sample_size)
        : null,
    },
    target_offer: {
      base_lpa:          num(raw.target_offer?.base_lpa),
      variable_lpa:      num(raw.target_offer?.variable_lpa),
      esop_value_lpa:    num(raw.target_offer?.esop_value_lpa),
      joining_bonus_lpa: num(raw.target_offer?.joining_bonus_lpa),
      total_lpa:         num(raw.target_offer?.total_lpa),
      rationale:         trunc(raw.target_offer?.rationale, 240),
    },
    talking_points: (raw.talking_points ?? []).slice(0, 5).map((s) => trunc(s, 240)),
    counter_offer_email: {
      subject: trunc(raw.counter_offer_email?.subject, 120),
      body:    trunc(raw.counter_offer_email?.body, 1200),
    },
    response_email: {
      subject: trunc(raw.response_email?.subject, 120),
      body:    trunc(raw.response_email?.body, 1200),
    },
    walkaway_threshold: {
      lpa:       num(raw.walkaway_threshold?.lpa),
      rationale: trunc(raw.walkaway_threshold?.rationale, 240),
    },
    esop_vs_cash: trunc(raw.esop_vs_cash, 600),
    risk_flags: (raw.risk_flags ?? []).slice(0, 4).map((s) => trunc(s, 180)),
  };
}
