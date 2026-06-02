// JSON Resume schema (v1.0.0).
//
// Source spec: https://jsonresume.org/schema/ (MIT — published independently
// of any specific resume editor). We adopt this as the canonical interop
// format so ProdMatch users can:
//
//   - Import a resume.json they exported from another tool.
//   - Export their resume in a portable, vendor-neutral format.
//   - Edit individual sections in a structured way.
//
// We intentionally keep this schema strict but tolerant of unknown extra
// keys (passthrough) — third-party editors sometimes attach vendor
// extensions and we don't want to throw on import.
//
// Privacy: this schema describes the shape only. The actual resume data is
// PII and must never appear in logs, telemetry, or LLM prompts that aren't
// owner-scoped. RLS on resume_versions enforces this at the DB layer.

import { z } from "zod";

// Lenient date: accept whatever the parser or user supplies (e.g. "2024-08",
// "2024", "Present", "Aug 2024 – Present"). The previous strict regex rejected
// common real-world formats, which made the Save / Submit actions throw
// "Some fields are invalid" the moment a user edited an employment date.
// Display/print render dates as plain text, so strict validation buys nothing.
const isoDate = z.string();

const LocationSchema = z.object({
  address:     z.string().optional(),
  postalCode:  z.string().optional(),
  city:        z.string().optional(),
  countryCode: z.string().optional(),
  region:      z.string().optional(),
}).passthrough();

const ProfileSchema = z.object({
  network:  z.string(),
  username: z.string().optional(),
  url:      z.string().optional(),
}).passthrough();

const BasicsSchema = z.object({
  name:     z.string().default(""),
  label:    z.string().optional(),
  image:    z.string().optional(),
  email:    z.string().optional(),
  phone:    z.string().optional(),
  url:      z.string().optional(),
  summary:  z.string().optional(),
  location: LocationSchema.optional(),
  profiles: z.array(ProfileSchema).default([]),
}).passthrough();

const WorkSchema = z.object({
  name:       z.string(),               // company name
  position:   z.string(),                // role title
  url:        z.string().optional(),
  startDate:  isoDate.optional(),
  endDate:    isoDate.optional(),
  summary:    z.string().optional(),
  highlights: z.array(z.string()).default([]),
}).passthrough();

const EducationSchema = z.object({
  institution: z.string(),
  url:         z.string().optional(),
  area:        z.string().optional(),    // field of study
  studyType:   z.string().optional(),    // e.g. "Bachelor"
  startDate:   isoDate.optional(),
  endDate:     isoDate.optional(),
  score:       z.string().optional(),    // GPA or grade
  courses:     z.array(z.string()).default([]),
}).passthrough();

const SkillSchema = z.object({
  name:     z.string(),                 // group label, e.g. "Backend"
  level:    z.string().optional(),
  keywords: z.array(z.string()).default([]),
}).passthrough();

const ProjectSchema = z.object({
  name:        z.string(),
  description: z.string().optional(),
  highlights:  z.array(z.string()).default([]),
  keywords:    z.array(z.string()).default([]),
  startDate:   isoDate.optional(),
  endDate:     isoDate.optional(),
  url:         z.string().optional(),
  roles:       z.array(z.string()).default([]),
  entity:      z.string().optional(),
  type:        z.string().optional(),
}).passthrough();

const AwardSchema = z.object({
  title:   z.string(),
  date:    isoDate.optional(),
  awarder: z.string().optional(),
  summary: z.string().optional(),
}).passthrough();

const CertificateSchema = z.object({
  name:   z.string(),
  date:   isoDate.optional(),
  issuer: z.string().optional(),
  url:    z.string().optional(),
}).passthrough();

const LanguageSchema = z.object({
  language: z.string(),
  fluency:  z.string().optional(),
}).passthrough();

const InterestSchema = z.object({
  name:     z.string(),
  keywords: z.array(z.string()).default([]),
}).passthrough();

const MetaSchema = z.object({
  canonical:    z.string().optional(),
  version:      z.string().optional(),
  lastModified: z.string().optional(),
}).passthrough();

export const JsonResumeSchema = z.object({
  $schema:      z.string().optional(),
  basics:       BasicsSchema.default({ name: "", profiles: [] }),
  work:         z.array(WorkSchema).default([]),
  education:    z.array(EducationSchema).default([]),
  skills:       z.array(SkillSchema).default([]),
  projects:     z.array(ProjectSchema).default([]),
  awards:       z.array(AwardSchema).default([]),
  certificates: z.array(CertificateSchema).default([]),
  languages:    z.array(LanguageSchema).default([]),
  interests:    z.array(InterestSchema).default([]),
  meta:         MetaSchema.optional(),
}).passthrough();

export type JsonResume = z.infer<typeof JsonResumeSchema>;
export type JsonResumeBasics = z.infer<typeof BasicsSchema>;
export type JsonResumeWork = z.infer<typeof WorkSchema>;
export type JsonResumeEducation = z.infer<typeof EducationSchema>;
export type JsonResumeSkill = z.infer<typeof SkillSchema>;
export type JsonResumeProject = z.infer<typeof ProjectSchema>;
export type JsonResumeCertificate = z.infer<typeof CertificateSchema>;
export type JsonResumeAward = z.infer<typeof AwardSchema>;
export type JsonResumeLanguage = z.infer<typeof LanguageSchema>;

/**
 * Empty-but-valid JSON Resume document — used as a fallback when a user has
 * no resume yet (the editor renders a blank shell instead of crashing).
 */
export const EMPTY_JSON_RESUME: JsonResume = {
  basics: { name: "", profiles: [] },
  work: [],
  education: [],
  skills: [],
  projects: [],
  awards: [],
  certificates: [],
  languages: [],
  interests: [],
};
