import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DpdpEventType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  // Fetch all user-scoped data in parallel
  const [
    { data: profile },
    { data: consents },
    { data: applications },
    { data: interviewNotes },
    { data: matches },
    { data: stories },
    { data: offers },
    { data: digestSub },
    { data: dpdpEvents },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("consents").select("*").eq("user_id", uid),
    supabase.from("applications").select("*").eq("user_id", uid),
    supabase
      .from("interview_notes")
      .select("*, applications!inner(user_id)")
      .eq("applications.user_id", uid),
    supabase
      .from("matches")
      .select("job_id, score, strengths, gaps, reasoning, computed_at")
      .eq("user_id", uid),
    supabase.from("stories").select("*").eq("user_id", uid),
    supabase.from("offers").select("*").eq("user_id", uid),
    supabase
      .from("digest_subscriptions")
      .select("frequency, last_sent_at, next_send_at")
      .eq("user_id", uid)
      .maybeSingle(),
    supabase.from("dpdp_events").select("*").eq("user_id", uid),
  ]);

  // Audit the export request
  const admin = createSupabaseAdminClient();
  await admin.from("dpdp_events").insert({
    user_id: uid,
    event: "export_requested" as DpdpEventType,
    metadata: { requested_at: new Date().toISOString() },
  });

  const exportPayload = {
    exported_at: new Date().toISOString(),
    dpdp_notice:
      "Exported under DPDP Act 2023 (India). This file contains all personal data held by ProdMatch.ai for the authenticated user.",
    account: {
      id: uid,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    consents,
    digest_subscription: digestSub,
    matches,
    applications,
    interview_notes: interviewNotes,
    stories,
    offers,
    dpdp_audit_log: dpdpEvents,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prodmatch-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
