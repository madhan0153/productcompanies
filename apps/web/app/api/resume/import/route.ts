// POST /api/resume/import — JSON Resume import.
//
// Accepts a JSON Resume v1.0.0 document (jsonresume.org), validates it
// against the strict zod schema, converts it to ProdMatch's ParsedResume
// shape, and writes a new row to resume_versions with source='json_import'.
// Inspired by Reactive Resume's import flow; reimplemented against the open
// spec — no AGPL code involved.
//
// Authorization: Supabase Auth session required. The insert uses the user's
// own session (not service-role) so RLS verifies user_id = auth.uid() at
// write time.
//
// Privacy:
//   - Request body is read once and never logged (only its byte size and a
//     boolean schema-validation result go to telemetry).
//   - Rejects payloads larger than 256 KB — a sensible cap that fits any
//     real resume and shuts down accidental dumps.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonResumeSchema } from "@prodmatch/shared";
import { jsonToParsedResume } from "@/lib/resume/json-mapper";
import { logEvent } from "@/lib/observability/log";
import { getUserConsents } from "@/lib/dpdp/consent";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 256 * 1024;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // QA fix: match the consent gate on the upload action. Without this, a
  // user who revoked Matching consent could still publish a resume version
  // via the JSON import path.
  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return NextResponse.json(
      { error: "Enable AI Matching consent in Settings → Privacy to import a resume." },
      { status: 403 },
    );
  }

  // Rate-limit imports the same way uploads are limited.
  const limit = checkRateLimit({
    key: userActionKey(user.id, "resume-import"),
    limit: 6,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many imports. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Bound payload size before parsing.
  const text = await req.text();
  if (text.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: `Payload too large (max ${MAX_PAYLOAD_BYTES} bytes)` },
      { status: 413 },
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = JsonResumeSchema.safeParse(raw);
  if (!parsed.success) {
    // Note: we report top-level field paths, not values — never leak the
    // user's resume content back through the error channel.
    const fields = parsed.error.issues.map((i) => i.path.join(".")).slice(0, 5);
    logEvent("warn", "resume_import_rejected", {
      reason: "schema_invalid",
      fields: fields.join(","),
      bytes: text.length,
    });
    return NextResponse.json(
      { error: "JSON Resume schema validation failed", fields },
      { status: 422 },
    );
  }

  const jsonResume = parsed.data;
  const parsedResume = jsonToParsedResume(jsonResume);

  // Insert via the user's session; RLS validates user_id = auth.uid().
  // Cast as any: generated types don't yet know about resume_json.
  const { data: inserted, error } = await (supabase
    .from("resume_versions")
    .insert({
      user_id: user.id,
      resume_parsed: parsedResume,
      resume_json: jsonResume,
      source: "json_import",
    } as unknown as never)
    .select("id, created_at")
    .single() as unknown as Promise<{
      data: { id: string; created_at: string };
      error: { code?: string; message: string } | null;
    }>);

  if (error) {
    logEvent("error", "resume_import_db_error", {
      code: error.code ?? null,
      bytes: text.length,
    });
    return NextResponse.json({ error: "Failed to persist resume" }, { status: 500 });
  }

  logEvent("info", "resume_import_ok", {
    bytes: text.length,
    versionId: inserted.id,
  });

  return NextResponse.json(
    { id: inserted.id, created_at: inserted.created_at },
    { status: 201 },
  );
}
