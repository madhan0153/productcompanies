// Tailored resume print-view route.
// Mirrors the enhanced version — auth-protected, returns printable HTML
// that triggers Save-as-PDF natively in the browser.

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderPrintableResumeHtml } from "@/lib/render/resume-pdf";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createSupabaseAdminClient();

  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("content, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: { content: TailoredResumeContent | null; status: string } | null;
    };

  if (!row || !row.content || row.status !== "finalised") {
    return NextResponse.json({ error: "Not ready." }, { status: 404 });
  }

  const autoprint = req.nextUrl.searchParams.get("autoprint") === "1";
  const html = renderPrintableResumeHtml(row.content, { autoprint });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
