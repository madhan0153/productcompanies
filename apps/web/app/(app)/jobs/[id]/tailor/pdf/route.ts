import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderTailoredResumePdf } from "@/lib/pdf/tailored-resume";
import { logEvent } from "@/lib/observability/log";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

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

  try {
    const pdf = await renderTailoredResumePdf(row.content);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="tailored-resume-${jobId}.pdf"`,
      },
    });
  } catch (err) {
    logEvent("error", "tailored_resume_pdf_route_render_failed", {
      user_id: user.id.slice(0, 8),
      job_id: jobId,
      error: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message.slice(0, 160) : undefined,
    });
    return NextResponse.json({ error: "Couldn't render PDF." }, { status: 500 });
  }
}
