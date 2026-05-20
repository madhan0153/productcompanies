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
import { JsonResumeSchema } from "@prodmatch/shared";
import { jsonToParsedResume } from "@/lib/resume/json-mapper";
import { logEvent } from "@/lib/observability/log";

const MAX_PAYLOAD_BYTES = 256 * 1024;

export interface SaveResumeResult {
  ok: boolean;
  error?: string;
  versionId?: string;
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

  const parsed = JsonResumeSchema.safeParse(payload);
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
