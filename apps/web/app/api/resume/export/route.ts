// GET /api/resume/export — JSON Resume export.
//
// Returns the authenticated user's latest resume as a portable JSON Resume
// v1.0.0 document (https://jsonresume.org/schema/). Inspired by Reactive
// Resume's portability flow; reimplemented from the open JSON Resume spec.
//
// Authorization: Supabase Auth session required. RLS enforces user_id
// scoping on resume_versions — service role is not used here.
//
// Privacy:
//   - No request body or response body is logged.
//   - Only the owner can read their own resume (RLS).
//   - Response is `Content-Disposition: attachment` so the browser saves
//     it to the user's device, not to a server-cached URL.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsedResumeToJson, emptyJsonResume } from "@/lib/resume/json-mapper";
import { JsonResumeSchema, type JsonResume } from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Latest version wins. RLS guarantees user_id = auth.uid().
  // Cast as any: the generated Supabase types are regenerated separately
  // and don't yet know about the resume_json column added in schema.sql.
  const { data: latest, error } = await (supabase
    .from("resume_versions")
    .select("resume_parsed, resume_json, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<{
      data: { resume_parsed: unknown; resume_json: unknown; created_at: string } | null;
      error: { message: string } | null;
    }>);

  if (error) {
    return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
  }

  let payload: JsonResume;
  if (latest?.resume_json) {
    // Stored canonical JSON — re-validate before serving so a corrupted row
    // never escapes as malformed JSON Resume.
    const parsed = JsonResumeSchema.safeParse(latest.resume_json);
    payload = parsed.success ? parsed.data : emptyJsonResume();
  } else if (latest?.resume_parsed) {
    payload = parsedResumeToJson(latest.resume_parsed as ParsedResume);
  } else {
    payload = emptyJsonResume();
  }

  // Filename uses YYYY-MM-DD only; never the user's name (PII safety on
  // shared download UIs and screen recordings).
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="resume-${date}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
