import { z } from "zod";

export const RawJobSchema = z.object({
  external_id: z.string(),
  title: z.string(),
  location_raw: z.string().default(""),
  description: z.string().default(""),
  apply_url: z.string().optional(),
  posted_at: z.string().optional(), // ISO string or null
  raw: z.record(z.unknown()).default({}),
});
export type RawJob = z.infer<typeof RawJobSchema>;

export const SENIORITY_VALUES = [
  "intern", "junior", "mid", "senior", "staff",
  "principal", "lead", "manager", "director", "vp",
] as const;
export type Seniority = (typeof SENIORITY_VALUES)[number];

export const NormalizedJobSchema = z.object({
  company_id: z.string().uuid(),
  external_id: z.string(),
  signature: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  hubs: z.array(z.string()),
  min_experience_years: z.number().nullable(),
  max_experience_years: z.number().nullable(),
  comp_lpa_min: z.number().nullable(),
  comp_lpa_max: z.number().nullable(),
  tech_stack: z.array(z.string()),
  seniority: z.enum(SENIORITY_VALUES).nullable(),
  posted_at: z.string().nullable(),
  raw: z.record(z.unknown()),
});
export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;
