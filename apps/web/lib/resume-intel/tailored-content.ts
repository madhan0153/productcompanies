import type { BulletRewrite } from "@/lib/llm/prompts/bullet-rewrite";
import type { ExtractedResumeContent } from "@/lib/llm/prompts/extract-resume-content";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

export interface TailoredEnhancementDecision {
  /** "kept" | "skipped" | "edited" | "alt-<n>" (accepted alternative index) */
  choice: string;
  /** If choice='edited', the final edited bullet text. */
  text?: string;
}

export interface BuildEvidenceBackedTailoredInput {
  resume: ParsedResume;
  extracted: ExtractedResumeContent | null;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, TailoredEnhancementDecision>;
  displayName: string;
  preferredHubs: string[];
  jdTitle: string;
  jdMustHaves: string[];
  jdNiceToHaves: string[];
}

export function buildEvidenceBackedTailoredContent(
  input: BuildEvidenceBackedTailoredInput,
): TailoredResumeContent {
  const {
    resume,
    extracted,
    diagnosis,
    rewrites,
    decisions,
    displayName,
    preferredHubs,
    jdTitle,
    jdMustHaves,
    jdNiceToHaves,
  } = input;

  const weakByCompany = new Map<string, ResumeDiagnosis["weak_bullets"]>();
  for (const b of diagnosis.weak_bullets) {
    if (b.section === "experience" && b.company) {
      const key = normaliseKey(b.company);
      const arr = weakByCompany.get(key) ?? [];
      arr.push(b);
      weakByCompany.set(key, arr);
    }
  }

  const summaryWeak = diagnosis.weak_bullets.find((b) => b.section === "summary");
  let summary = cleanText(extracted?.summary || resume.summary);
  if (summaryWeak) {
    const idx = diagnosis.weak_bullets.indexOf(summaryWeak);
    summary = cleanText(resolveBulletText(summaryWeak, rewrites[idx], decisions[String(idx)]));
  }

  const jdTerms = [...jdMustHaves, ...jdNiceToHaves];
  const sourceSkills = extracted?.skills?.length ? extracted.skills : (resume.tech_stack ?? []);
  const sourceBackedJdTerms = jdTerms.filter((term) => containsTerm(sourceEvidenceText(resume, extracted), term));
  const skills = [{
    group: "Skills",
    items: orderSourceSkillsForJd([...sourceSkills, ...sourceBackedJdTerms], jdTerms),
  }].filter((group) => group.items.length > 0);

  const sourceExperience = extracted?.experience?.length
    ? extracted.experience
    : (resume.companies ?? []).map((c) => ({
        company: cleanText(c.name, "Company"),
        role: cleanText(c.role),
        duration: c.years > 0 ? `${c.years}+ yrs` : "",
        bullets: c.role ? [c.role] : [],
      }));

  const experience: TailoredResumeContent["experience"] = sourceExperience.map((c) => {
    const company = cleanText(c.company, "Company");
    const weakHere = weakByCompany.get(normaliseKey(company)) ?? [];
    const baseBullets = c.bullets.map((bullet) => cleanText(bullet)).filter(Boolean);
    const patched = baseBullets.map((b, bIdx) => {
      const match = weakHere.find((w) => w.bullet_index === bIdx);
      if (!match) return b;
      const idx = diagnosis.weak_bullets.indexOf(match);
      return cleanText(resolveBulletText(match, rewrites[idx], decisions[String(idx)]));
    });
    const extras = weakHere
      .filter((w) => w.bullet_index >= patched.length)
      .map((w) => {
        const idx = diagnosis.weak_bullets.indexOf(w);
        return cleanText(resolveBulletText(w, rewrites[idx], decisions[String(idx)]));
      })
      .filter((text) => text && !baseBullets.some((base) => sameText(base, text)));
    return {
      company,
      role: cleanText(c.role, "Engineer"),
      duration: cleanText(c.duration),
      bullets: [...patched, ...extras].slice(0, 5),
    };
  }).filter((role) => role.company || role.role || role.bullets.length > 0);

  const projectsWeak = diagnosis.weak_bullets.filter((b) => b.section === "projects");
  const sourceProjects = extracted?.projects?.length
    ? extracted.projects.map((p, idx) => ({
        name: cleanText(p.name, `Project ${idx + 1}`),
        summary: p.bullets.map((bullet) => cleanText(bullet)).filter(Boolean).join(" "),
      }))
    : (resume.products_built ?? []).map((p, idx) => ({
        name: cleanText(p.split(":")[0]?.slice(0, 80), `Project ${idx + 1}`),
        summary: cleanText(p),
      }));
  const projects: TailoredResumeContent["projects"] = sourceProjects.slice(0, 4).map((p, idx) => {
    const match = projectsWeak.find((w) => w.bullet_index === idx);
    const text = match
      ? resolveBulletText(
          match,
          rewrites[diagnosis.weak_bullets.indexOf(match)],
          decisions[String(diagnosis.weak_bullets.indexOf(match))],
        )
      : p.summary;
    return { name: cleanText(p.name, `Project ${idx + 1}`), tech: [], summary: cleanText(text) };
  }).filter((project) => project.name || project.summary);

  const education: TailoredResumeContent["education"] =
    extracted?.education?.length
      ? extracted.education.map((e) => ({
          institution: cleanText(e.institution, "Institution"),
          degree: cleanText(e.degree, "Degree"),
          year: e.year ?? null,
        }))
      : (resume.education ?? []).map((e) => ({
          institution: cleanText(e.institution, "Institution"),
          degree: cleanText(e.degree, "Degree"),
          year: e.year ?? null,
        }));

  const headerTitle = cleanText(resume.current_role || jdTitle, "Software Engineer");
  const candidateName = cleanText(displayName || resume.name, "Candidate");
  const primaryLocation = cleanText(preferredHubs[0], "India");

  return {
    header: {
      name: candidateName,
      title: headerTitle,
      location: primaryLocation,
      contact_line: "",
    },
    summary: summary || `${headerTitle} focused on product engineering roles.`,
    skills,
    experience,
    education,
    projects,
    tailoring_notes: `Conservative JD tailoring for "${jdTitle}": preserved source resume structure and applied only reviewed edits grounded in the resume and JD.`,
  };
}

function resolveBulletText(
  weak: ResumeDiagnosis["weak_bullets"][number],
  rewrite: BulletRewrite | undefined,
  decision: TailoredEnhancementDecision | undefined,
): string {
  if (!decision || decision.choice === "kept" || decision.choice === "skipped") return weak.original;
  if (decision.choice === "edited" && decision.text) return decision.text;
  const m = /^alt-(\d+)$/.exec(decision.choice);
  if (m && rewrite) {
    const idx = parseInt(m[1], 10);
    return rewrite.alternatives[idx]?.text ?? weak.original;
  }
  return weak.original;
}

function normaliseKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const cleaned = value
    .replace(/[\u2022\u25cf\u25e6]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function sameText(a: string, b: string) {
  return normaliseKey(a) === normaliseKey(b);
}

function containsTerm(text: string, term: string) {
  const haystack = normaliseKey(text);
  const needle = normaliseKey(term);
  return !!needle && haystack.includes(needle);
}

function sourceEvidenceText(resume: ParsedResume, extracted: ExtractedResumeContent | null) {
  return JSON.stringify({
    parsed: {
      current_role: resume.current_role,
      role_function: resume.role_function,
      summary: resume.summary,
      tech_stack: resume.tech_stack,
      products_built: resume.products_built,
      companies: resume.companies,
      education: resume.education,
    },
    extracted,
  });
}

function orderSourceSkillsForJd(skills: string[], jdTerms: string[]) {
  const deduped = dedupeClean(skills);
  const jd = jdTerms.map(normaliseKey).filter(Boolean);
  const relevant = deduped.filter((skill) => {
    const key = normaliseKey(skill);
    return jd.some((term) => term === key || term.includes(key) || key.includes(term));
  });
  const rest = deduped.filter((skill) => !relevant.some((r) => sameText(r, skill)));
  return [...relevant, ...rest];
}

function dedupeClean(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = normaliseKey(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}
