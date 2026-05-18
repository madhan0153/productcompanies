// Print-view route for an enhanced resume.
//
// Returns a self-contained HTML document tuned for browser print →
// "Save as PDF". Auto-print is triggered when ?autoprint=1 is set.
//
// Auth: requires the calling user to own the enhanced_resumes row. No
// signed-token nonsense — the user is already authenticated, they're
// downloading their own data.

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
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("enhanced_resumes")
    .select("enhanced_content, status, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle() as any) as {
      data: { enhanced_content: TailoredResumeContent | null; status: string; user_id: string } | null;
    };

  if (!row || !row.enhanced_content || row.status !== "finalised") {
    return NextResponse.json({ error: "Not ready." }, { status: 404 });
  }

  const autoprint = req.nextUrl.searchParams.get("autoprint") === "1";
  const html = renderPrintableResumeHtml(row.enhanced_content, { autoprint });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
