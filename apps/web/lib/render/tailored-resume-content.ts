import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

type UnknownRecord = Record<string, unknown>;

export function normalizeTailoredResumeContent(value: unknown): TailoredResumeContent {
  const root = asRecord(value);
  const header = asRecord(root.header);

  const skills = asRecordArray(root.skills)
    .map((group) => ({
      group: asText(group.group, "Skills"),
      items: asTextList(group.items, "commas").slice(0, 12),
    }))
    .filter((group) => group.group || group.items.length > 0);

  const experience = asRecordArray(root.experience)
    .map((role) => ({
      company: asText(role.company, "Company"),
      role: asText(role.role, "Engineer"),
      duration: asText(role.duration),
      bullets: asTextList(role.bullets, "lines").slice(0, 5),
    }))
    .filter((role) => role.company || role.role || role.bullets.length > 0);

  const education = asRecordArray(root.education)
    .map((item) => ({
      institution: asText(item.institution, "Institution"),
      degree: asText(item.degree, "Degree"),
      year: asYear(item.year),
    }))
    .filter((item) => item.institution || item.degree);

  const projects = asRecordArray(root.projects)
    .map((project, index) => ({
      name: asText(project.name, `Project ${index + 1}`),
      tech: asTextList(project.tech, "commas").slice(0, 8),
      summary: asText(project.summary),
    }))
    .filter((project) => project.name || project.summary);

  return {
    header: {
      name: asText(header.name, "Candidate"),
      title: asText(header.title, "Software Engineer"),
      location: asText(header.location, "India"),
      contact_line: asText(header.contact_line),
    },
    summary: asText(root.summary),
    skills,
    experience,
    education,
    projects,
    tailoring_notes: asText(root.tailoring_notes),
  };
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function asRecordArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(asRecord).filter((item) => Object.keys(item).length > 0);
  const single = asRecord(value);
  return Object.keys(single).length > 0 ? [single] : [];
}

function asText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return fallback;
  }

  const cleaned = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\u2022\u25cf\u25e6]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

function asTextList(value: unknown, mode: "commas" | "lines"): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean);
  }

  const text = asText(value);
  if (!text) return [];

  const splitter = mode === "commas" ? /[\n,;|]+/ : /(?:\r?\n)+|\s+[\u2022*-]\s+/;
  const parts = text.split(splitter).map((part) => asText(part)).filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

function asYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
