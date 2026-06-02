"use server";

// Server actions for the Reactive-Resume-inspired JSON Resume editor.
//
// Single entry point: saveResumeJson(json). Validates the payload against
// the strict JSON Resume schema, maps it back to the internal ParsedResume
// shape so legacy code paths (matcher, fit-card, embeddings) keep working,
// and writes a new immutable row to resume_versions with source='editor'.
//
// Privacy: this function operates on PII. We never log the payload — only
// its byte size and a boolean validation result.

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonResumeSchema, type JsonResume } from "@prodmatch/shared";
import { jsonToParsedResume } from "@/lib/resume/json-mapper";
import { logEvent } from "@/lib/observability/log";
import {
  computeMatchesForActiveResume,
  promoteReviewedResumeDraft,
  type ComputeMatchesResult,
} from "../actions";
import type { Json } from "@/lib/supabase/types";

const MAX_PAYLOAD_BYTES = 256 * 1024;

export interface SaveResumeResult {
  ok: boolean;
  error?: string;
  versionId?: string;
}

export interface SubmitReviewedResumeResult {
  ok: boolean;
  error?: string;
  activeResumeVersionId?: string;
}

export async function saveResumeJson(payload: unknown): Promise<SaveResumeResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  // Bound payload size — guards both accidental dumps and intentional abuse.
  const size = JSON.stringify(payload).length;
  if (size > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: `Resume too large (max ${MAX_PAYLOAD_BYTES} bytes).` };
  }

  const parsed = parseEditableResumePayload(payload);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).slice(0, 5);
    logEvent("warn", "resume_editor_invalid", {
      bytes: size,
      fields: fields.join(","),
    });
    return {
      ok: false,
      error: `Some fields are invalid: ${fields.join(", ")}`,
    };
  }

  const jsonResume = parsed.data;
  const parsedResume = jsonToParsedResume(jsonResume);

  // Cast as any: generated Supabase types don't yet know about resume_json.
  const { data: inserted, error } = await (supabase
    .from("resume_versions")
    .insert({
      user_id: user.id,
      resume_parsed: parsedResume,
      resume_json: jsonResume,
      source: "editor",
    } as unknown as never)
    .select("id")
    .single() as unknown as Promise<{
      data: { id: string };
      error: { code?: string; message: string } | null;
    }>);

  if (error) {
    logEvent("error", "resume_editor_db_error", {
      code: error.code ?? null,
      bytes: size,
    });
    return { ok: false, error: "Failed to save. Try again." };
  }

  logEvent("info", "resume_editor_saved", { bytes: size, versionId: inserted.id });
  revalidatePath("/profile/resume");
  return { ok: true, versionId: inserted.id };
}

export async function submitReviewedResume(
  versionId: string,
  payload: unknown,
): Promise<SubmitReviewedResumeResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const size = JSON.stringify(payload).length;
  if (size > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: `Resume too large (max ${MAX_PAYLOAD_BYTES} bytes).` };
  }

  const parsed = parseEditableResumePayload(payload);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).slice(0, 5);
    logEvent("warn", "resume_review_invalid", {
      bytes: size,
      fields: fields.join(","),
    });
    return { ok: false, error: `Some fields are invalid: ${fields.join(", ")}` };
  }

  const jsonResume = parsed.data;
  const parsedResume = jsonToParsedResume(jsonResume);
  const promoted = await promoteReviewedResumeDraft(
    versionId,
    parsedResume,
    jsonResume as unknown as Json,
  );
  if (!promoted.ok) return promoted;

  logEvent("info", "resume_review_submitted", {
    bytes: size,
    versionId,
  });
  revalidatePath("/profile");
  revalidatePath("/profile/resume");
  revalidatePath("/matches");
  return { ok: true, activeResumeVersionId: promoted.activeResumeVersionId };
}

export async function startMatchCompute(): Promise<ComputeMatchesResult> {
  return computeMatchesForActiveResume();
}

function parseEditableResumePayload(payload: unknown) {
  return JsonResumeSchema.safeParse(normalizeEditableResumePayload(payload));
}

function normalizeEditableResumePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  const basics = asRecord(record.basics);

  return {
    ...record,
    basics: {
      ...basics,
      name: asString(basics.name),
      label: asOptionalString(basics.label),
      email: asOptionalString(basics.email),
      phone: asOptionalString(basics.phone),
      url: asOptionalString(basics.url),
      summary: asOptionalString(basics.summary),
      location: normalizeLocation(basics.location),
      profiles: normalizeArray(basics.profiles).map((profile) => {
        const p = asRecord(profile);
        return {
          ...p,
          network: asString(p.network),
          username: asOptionalString(p.username),
          url: asOptionalString(p.url),
        };
      }),
    },
    work: normalizeArray(record.work).map((work) => {
      const w = asRecord(work);
      return {
        ...w,
        name: asString(w.name),
        position: asString(w.position),
        startDate: asOptionalString(w.startDate),
        endDate: asOptionalString(w.endDate),
        summary: asOptionalString(w.summary),
        highlights: normalizeStringArray(w.highlights),
      };
    }),
    education: normalizeArray(record.education).map((education) => {
      const e = asRecord(education);
      return {
        ...e,
        institution: asString(e.institution),
        area: asOptionalString(e.area),
        studyType: asOptionalString(e.studyType),
        startDate: asOptionalString(e.startDate),
        endDate: asOptionalString(e.endDate),
        courses: normalizeStringArray(e.courses),
      };
    }),
    skills: normalizeArray(record.skills).map((skill) => {
      const s = asRecord(skill);
      return {
        ...s,
        name: asString(s.name),
        level: asOptionalString(s.level),
        keywords: normalizeStringArray(s.keywords),
      };
    }),
    projects: normalizeArray(record.projects).map((project) => {
      const p = asRecord(project);
      return {
        ...p,
        name: asString(p.name),
        description: asOptionalString(p.description),
        highlights: normalizeStringArray(p.highlights),
        keywords: normalizeStringArray(p.keywords),
        roles: normalizeStringArray(p.roles),
      };
    }),
    awards: normalizeArray(record.awards).map((award) => {
      const a = asRecord(award);
      return {
        ...a,
        title: asString(a.title),
        date: asOptionalString(a.date),
        awarder: asOptionalString(a.awarder),
        summary: asOptionalString(a.summary),
      };
    }),
    certificates: normalizeArray(record.certificates).map((certificate) => {
      const c = asRecord(certificate);
      return {
        ...c,
        name: asString(c.name),
        issuer: asOptionalString(c.issuer),
        date: asOptionalString(c.date),
        url: asOptionalString(c.url),
      };
    }),
    languages: normalizeArray(record.languages).map((language) => {
      const l = asRecord(language);
      return {
        ...l,
        language: asString(l.language),
        fluency: asOptionalString(l.fluency),
      };
    }),
    interests: normalizeArray(record.interests).map((interest) => {
      const i = asRecord(interest);
      return {
        ...i,
        name: asString(i.name),
        keywords: normalizeStringArray(i.keywords),
      };
    }),
  } satisfies JsonResume;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeLocation(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const location = asRecord(value);
  const normalized = {
    address: asOptionalString(location.address),
    postalCode: asOptionalString(location.postalCode),
    city: asOptionalString(location.city),
    countryCode: asOptionalString(location.countryCode),
    region: asOptionalString(location.region),
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, item]) => item !== undefined)) as Record<string, string>;
}

function normalizeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value: unknown): string[] {
  return normalizeArray(value).map(asString).map((item) => item.trim()).filter(Boolean);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asOptionalString(value: unknown): string | undefined {
  const str = asString(value).trim();
  return str ? str : undefined;
}
