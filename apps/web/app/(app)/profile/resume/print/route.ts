// GET /profile/resume/print?template=<ats|modern>&autoprint=1
//
// Renders the authenticated user's latest resume as a printable HTML page.
// Reactive-Resume-inspired multi-template preview; reimplemented from
// scratch against the JSON Resume spec.
//
// Authorization: Supabase Auth session required. RLS scopes the read to
// the owner. Page emits noindex headers so search engines never crawl.
//
// Privacy:
//   - HTML is computed on demand from the owner's resume_versions row.
//   - Response is `Cache-Control: no-store`.
//   - Filename / meta never includes the user's name verbatim.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonResumeSchema, type JsonResume } from "@prodmatch/shared";
import { parsedResumeToJson, emptyJsonResume } from "@/lib/resume/json-mapper";
import {
  renderJsonResumeHtml,
  ALL_TEMPLATES,
  type ResumeTemplate,
} from "@/lib/render/json-resume-templates";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Sign in required.", { status: 401 });
  }

  const url = new URL(req.url);
  const requested = (url.searchParams.get("template") ?? "ats").toLowerCase();
  const template: ResumeTemplate = ALL_TEMPLATES.includes(requested as ResumeTemplate)
    ? (requested as ResumeTemplate)
    : "ats";
  const autoprint = url.searchParams.get("autoprint") === "1";

  // Latest version wins. RLS ensures user_id = auth.uid().
  // Cast as any: generated Supabase types don't yet know about resume_json.
  const { data: latest } = await (supabase
    .from("resume_versions")
    .select("resume_parsed, resume_json")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<{
      data: { resume_parsed: unknown; resume_json: unknown } | null;
    }>);

  let resume: JsonResume;
  if (latest?.resume_json) {
    const parsed = JsonResumeSchema.safeParse(latest.resume_json);
    resume = parsed.success ? parsed.data : emptyJsonResume();
  } else if (latest?.resume_parsed) {
    resume = parsedResumeToJson(latest.resume_parsed as ParsedResume);
  } else {
    resume = emptyJsonResume();
  }

  const html = renderJsonResumeHtml(resume, template, { autoprint });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
