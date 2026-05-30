// Sprint 5 — Feature 34a. JD-targeted resume tailoring.
//
// Takes the candidate's parsed resume + JD must/nice-to-have skills + the
// Fit Card's resume_tweaks (if available) and produces a complete,
// structured resume re-organised for this specific role. The output is a
// JSON document the PDF renderer turns into a downloadable resume.
//
// Strict rules to prevent hallucination:
//   - The model MAY reorder, reword for impact, and surface implicit
//     skills the resume actually demonstrates.
//   - The model MAY NOT invent companies, degrees, dates, technologies,
//     project names, or metrics that aren't in the parsed_resume input.
//   - Each output bullet must be derivable from the input — the prompt
//     explicitly instructs "do not invent measurable metrics; only use
//     numbers explicitly written in the source resume."
//
// Cost: one Gemini call per tailored resume. Cached via
// tailored_resumes(user_id, job_id) so the second click on the same job
// re-uses the prior generation (unless resume_signature or job_signature
// changed, which invalidates the cache).

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";

export interface TailoredResumeContent {
  /** Headline at the top of the resume: name + role + city.
   *  `contact_line` is NOT produced by the LLM — it is assembled in code from
   *  the verified account email + the user's profile contact fields. It is
   *  always present on the type so renderers can read it, but the model never
   *  sees or writes contact PII. */
  header: {
    name: string;
    title: string;          // current_role rewritten to align with JD's role family
    location: string;       // candidate's primary city (from preferred_hubs)
    contact_line: string;   // code-assembled: "email · phone · linkedin · github"
  };
  /** 2-3 sentence professional summary, rewritten for THIS JD's signal. */
  summary: string;
  /** Skills sectioned into groups, with JD-priority items surfaced first. */
  skills: Array<{ group: string; items: string[] }>;
  /** Work history. Bullets reordered/rewritten to lead with JD-relevant signal.
   *  EACH bullet must be derivable from the source resume's products_built or
   *  company role descriptions — the model is forbidden from inventing. */
  experience: Array<{
    company: string;
    role: string;
    duration: string;       // "2021 – Present" — pulled from source
    bullets: string[];      // 3-5 per role, action-verb led
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: number | null;
  }>;
  /** Professional certifications, JD-relevant ones surfaced first. Copied
   *  verbatim from the parsed resume — never invented. */
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number | null;
  }>;
  /** Optional list of personal / open-source projects, when present. */
  projects?: Array<{
    name: string;
    tech: string[];
    summary: string;
  }>;
  /** A few sentences explaining the reasoning behind the changes — kept on
   *  the result row for transparency, never goes into the generated PDF. */
  tailoring_notes: string;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    header: {
      type: SchemaType.OBJECT,
      properties: {
        name:     { type: SchemaType.STRING },
        title:    { type: SchemaType.STRING },
        location: { type: SchemaType.STRING },
      },
      required: ["name", "title", "location"],
    },
    summary: { type: SchemaType.STRING },
    skills: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          group: { type: SchemaType.STRING },
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["group", "items"],
      },
    },
    experience: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company:  { type: SchemaType.STRING },
          role:     { type: SchemaType.STRING },
          duration: { type: SchemaType.STRING },
          bullets:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["company", "role", "duration", "bullets"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree:      { type: SchemaType.STRING },
          year:        { type: SchemaType.NUMBER },
        },
        required: ["institution", "degree"],
      },
    },
    certifications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:   { type: SchemaType.STRING },
          issuer: { type: SchemaType.STRING },
          year:   { type: SchemaType.NUMBER },
        },
        required: ["name", "issuer"],
      },
    },
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:    { type: SchemaType.STRING },
          tech:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          summary: { type: SchemaType.STRING },
        },
        required: ["name", "tech", "summary"],
      },
    },
    tailoring_notes: { type: SchemaType.STRING },
  },
  required: ["header", "summary", "skills", "experience", "education", "tailoring_notes"],
};

export interface TailorInput {
  resume: ParsedResume;
  job: {
    title: string;
    company: string;
    role_function: string | null;
    seniority: string | null;
    location: string;
  };
  jd: {
    summary: string;
    must_have_skills: string[];
    nice_to_have_skills: string[];
    responsibilities: string[];
  };
  /** From the Fit Card. Each suggestion is a paste-ready bullet the user has
   *  effectively pre-approved. The tailoring prompt incorporates these
   *  literally (subject to dedup with existing resume bullets). */
  resume_tweaks?: Array<{ priority: number; suggestion: string; why: string }>;
}

function buildPrompt(x: TailorInput): string {
  const r = x.resume;
  const companies = (r.companies ?? []).map((c) => `${c.name} | ${c.role} | ${c.years} yrs | product_co=${c.is_product_company}`).join("\n  ");
  const projects  = (r.products_built ?? []).map((p, i) => `${i + 1}. ${p}`).join("\n  ");
  const tweaks    = (x.resume_tweaks ?? []).map((t, i) => `${i + 1}. (priority ${t.priority}) ${t.suggestion}  // serves: ${t.why}`).join("\n  ");
  const education = (r.education ?? []).map((e) => `${e.degree} from ${e.institution}${e.year ? ` (${e.year})` : ""}`).join("\n  ");
  const certs     = (r.certifications ?? []).map((c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`).join("\n  ");

  return `You are an elite resume consultant who has rewritten 5,000+ engineering
resumes for placement at Indian product companies. Produce a JD-targeted
tailored resume for THIS specific application.

ROLE BEING TARGETED
- ${x.job.title} at ${x.job.company} (${x.job.location})
- Function: ${x.job.role_function ?? "?"} · Seniority: ${x.job.seniority ?? "?"}
- JD summary: ${x.jd.summary}
- JD must-have skills: ${x.jd.must_have_skills.join(", ") || "(none stated)"}
- JD nice-to-have skills: ${x.jd.nice_to_have_skills.join(", ") || "(none stated)"}
- JD responsibilities (top items):
  ${x.jd.responsibilities.slice(0, 6).map((r) => `- ${r}`).join("\n  ") || "(JD body was light on responsibilities)"}

CANDIDATE (source-of-truth)
- Name: ${r.name}
- Current role: ${r.current_role}
- Role function: ${r.role_function}
- Years experience: ${r.total_years_experience}
- Tech stack on resume: ${r.tech_stack.join(", ")}
- Companies:
  ${companies || "(none)"}
- Projects / impact bullets:
  ${projects || "(none — only summary + role titles available)"}
- Education:
  ${education || "(not extracted)"}
- Certifications:
  ${certs || "(none)"}
- Original summary: ${r.summary ?? ""}

NOTE: Contact details (email, phone, LinkedIn, GitHub) are deliberately NOT
provided here and must NOT appear anywhere in your output. The platform adds
the candidate's verified contact line in code after you respond.

PRE-APPROVED TWEAKS (from the Fit Card — paste these verbatim if applicable)
  ${tweaks || "(none)"}

NON-NEGOTIABLE RULES
1. NEVER invent companies, roles, dates, degrees, or technologies that
   don't appear in CANDIDATE source-of-truth above. If a JD must-have
   isn't in the source resume, leave it out — do NOT fabricate a project.
2. NEVER invent quantitative metrics. Only use numbers explicitly written
   in the source resume's products_built / role descriptions. If the source
   bullet says "scaled to 1M users", you may reuse "1M users". If it says
   "led a small team" with no number, the rewrite cannot become "led a
   team of 12".
3. Reorder + reword + surface implicit skills. You MAY:
   - Move JD-relevant experience earlier inside a role's bullets.
   - Rewrite bullets to lead with strong verbs and JD-aligned vocabulary.
   - Group skills so JD must-haves appear first in the skills section.
   - Pull projects forward when they hit JD requirements.
4. EACH bullet ≤ 220 chars. Each role ≤ 5 bullets. Skills groups ≤ 6 items.
5. Summary ≤ 3 sentences, ≤ 480 chars total. JD-relevant; not generic.
6. Use Indian English conventions (no Oxford comma fetish, use "LPA" when
   referencing comp, etc.).
7. Certifications: include ONLY those listed in the candidate source above,
   copied faithfully. Order JD-relevant certs first (e.g. a cloud cert when
   the JD is cloud-heavy). Never invent a certification. Omit the section
   entirely if the candidate has none.

OUTPUT SHAPE
Match the schema exactly. The 'tailoring_notes' field at the end is a short
(≤500 char) plain-English explanation of WHAT YOU CHANGED and WHY — the
user reads this to verify they're comfortable with the rewrite before
downloading.

Respond as JSON matching the schema. No prose outside the JSON.`;
}

export async function generateTailoredResume(input: TailorInput): Promise<TailoredResumeContent> {
  // Heavy tier — resume rewriting is quality-critical. 25s soft cap so we
  // don't block the user-facing action handler past Vercel's max.
  const text = await runWithRetry("heavy", async (model) => {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    return res.response.text();
  }, { operation: "tailored_resume" });

  const raw = JSON.parse(text) as TailoredResumeContent;

  // Defensive shape + length truncation. The schema guarantees structure
  // but not bounds — Gemini occasionally overruns.
  const trunc = (s: string | undefined, n: number) => (s ?? "").slice(0, n);
  return {
    header: {
      name:     trunc(raw.header?.name, 80),
      title:    trunc(raw.header?.title, 120),
      location: trunc(raw.header?.location, 80),
      // Contact line is never produced by the LLM — it is assembled in code
      // from verified sources downstream. Start empty.
      contact_line: "",
    },
    summary: trunc(raw.summary, 480),
    skills: (raw.skills ?? []).slice(0, 8).map((g) => ({
      group: trunc(g.group, 50),
      items: (g.items ?? []).slice(0, 12).map((i) => trunc(i, 40)),
    })),
    experience: (raw.experience ?? []).slice(0, 8).map((e) => ({
      company:  trunc(e.company, 80),
      role:     trunc(e.role, 80),
      duration: trunc(e.duration, 40),
      bullets:  (e.bullets ?? []).slice(0, 5).map((b) => trunc(b, 220)),
    })),
    education: (raw.education ?? []).slice(0, 4).map((e) => ({
      institution: trunc(e.institution, 80),
      degree:      trunc(e.degree, 80),
      year:        typeof e.year === "number" && Number.isFinite(e.year) ? e.year : null,
    })),
    certifications: (raw.certifications ?? []).slice(0, 8).map((c) => ({
      name:   trunc(c.name, 100),
      issuer: trunc(c.issuer, 80),
      year:   typeof c.year === "number" && Number.isFinite(c.year) ? c.year : null,
    })),
    projects: (raw.projects ?? []).slice(0, 4).map((p) => ({
      name:    trunc(p.name, 60),
      tech:    (p.tech ?? []).slice(0, 8).map((t) => trunc(t, 30)),
      summary: trunc(p.summary, 200),
    })),
    tailoring_notes: trunc(raw.tailoring_notes, 500),
  };
}

/**
 * Assemble the resume header contact line in code — NEVER via the LLM.
 * Email comes from the verified account; phone/LinkedIn/GitHub from the
 * user's profile. Empty fields are dropped. This is the single source of
 * truth for contact rendering across the PDF / HTML / DOCX outputs.
 */
export function buildContactLine(contact: {
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
}): string {
  return [contact.email, contact.phone, contact.linkedin_url, contact.github_url]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .join("  ·  ");
}
