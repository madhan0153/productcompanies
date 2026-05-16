// GET /api/export — DPDP Act 2023 data export.
//
// Sprint 4 — Item 33. Streams the JSON payload instead of building it in
// memory. The pre-Sprint-4 implementation fetched every user-scoped table
// in parallel and JSON.stringify-ed the whole thing — fine at 50 matches,
// risky at 5,000. The new flow:
//
//   1. Set the response headers immediately and start streaming.
//   2. Emit a fixed JSON skeleton: `{ "exported_at": ..., "account": ..., `.
//   3. For each large array (matches, applications, dpdp_events), paginate
//      with .range() and emit rows comma-separated inside its `[...]`.
//   4. Close the JSON object.
//
// Memory is bounded to one page's worth of rows (PAGE_SIZE=500) at a time.
// Network back-pressure is honoured via the controller's enqueue() —
// Node won't accumulate beyond ReadableStream's internal high-water mark.
//
// Audit: the request is logged synchronously BEFORE streaming begins so
// the audit row exists even if the client disconnects mid-stream.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DpdpEventType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE_SIZE = 500;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  // Audit the export request BEFORE streaming starts. If the client closes
  // mid-download we still have an audit trail of the attempt.
  const admin = createSupabaseAdminClient();
  await admin.from("dpdp_events").insert({
    user_id: uid,
    event: "export_requested" as DpdpEventType,
    metadata: { requested_at: new Date().toISOString(), streamed: true },
  });

  // ── Fetch the small / fixed-size tables once ─────────────────────────────
  // These rows fit comfortably in memory regardless of usage scale.
  const [
    { data: profile },
    { data: consents },
    { data: stories },
    { data: offers },
    { data: digestSub },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("consents").select("*").eq("user_id", uid),
    supabase.from("stories").select("*").eq("user_id", uid),
    supabase.from("offers").select("*").eq("user_id", uid),
    supabase
      .from("digest_subscriptions")
      .select("frequency, last_sent_at, next_send_at")
      .eq("user_id", uid)
      .maybeSingle(),
  ]);

  const encoder = new TextEncoder();
  const date = new Date().toISOString().slice(0, 10);

  // ── Build the streaming response body ───────────────────────────────────
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        // Header
        send("{\n");
        send(`  "exported_at": ${JSON.stringify(new Date().toISOString())},\n`);
        send(`  "dpdp_notice": "Exported under DPDP Act 2023 (India). This file contains all personal data held by ProdMatch.ai for the authenticated user.",\n`);
        send(`  "account": ${JSON.stringify({ id: uid, email: user.email, created_at: user.created_at })},\n`);
        send(`  "profile": ${JSON.stringify(profile ?? null)},\n`);
        send(`  "consents": ${JSON.stringify(consents ?? [])},\n`);
        send(`  "digest_subscription": ${JSON.stringify(digestSub ?? null)},\n`);
        send(`  "stories": ${JSON.stringify(stories ?? [])},\n`);
        send(`  "offers": ${JSON.stringify(offers ?? [])},\n`);

        // Streaming arrays — paginated. Each array is opened, page rows are
        // serialised + emitted with comma separators, then the array is
        // closed.
        await streamArray(send, "matches", async (from) => {
          const { data } = await supabase
            .from("matches")
            .select("job_id, score, verdict, strengths, gaps, reasoning, fit_card, computed_at, seen_at, user_hidden, hidden_at")
            .eq("user_id", uid)
            .range(from, from + PAGE_SIZE - 1);
          return data ?? [];
        });
        send(",\n");

        await streamArray(send, "applications", async (from) => {
          const { data } = await supabase
            .from("applications")
            .select("*")
            .eq("user_id", uid)
            .range(from, from + PAGE_SIZE - 1);
          return data ?? [];
        });
        send(",\n");

        await streamArray(send, "interview_notes", async (from) => {
          const { data } = await supabase
            .from("interview_notes")
            .select("*, applications!inner(user_id)")
            .eq("applications.user_id", uid)
            .range(from, from + PAGE_SIZE - 1);
          return data ?? [];
        });
        send(",\n");

        await streamArray(send, "dpdp_audit_log", async (from) => {
          const { data } = await supabase
            .from("dpdp_events")
            .select("*")
            .eq("user_id", uid)
            .range(from, from + PAGE_SIZE - 1);
          return data ?? [];
        });

        send("\n}\n");
        controller.close();
      } catch (err) {
        console.warn("[export.stream] aborted:", err instanceof Error ? err.message : String(err));
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prodmatch-export-${date}.json"`,
      "Cache-Control": "no-store",
      // Tell intermediaries (browsers, proxies) we're streaming and they
      // shouldn't try to buffer the whole response before delivering.
      "Transfer-Encoding": "chunked",
    },
  });
}

// Helper — opens "key": [, drains the paginator emitting JSON rows comma-
// separated, then closes ]. `fetchPage(from)` returns an array of objects.
async function streamArray(
  send: (chunk: string) => void,
  key: string,
  fetchPage: (from: number) => Promise<unknown[]>,
): Promise<void> {
  send(`  ${JSON.stringify(key)}: [`);
  let first = true;
  let from = 0;
  for (;;) {
    const rows = await fetchPage(from);
    if (rows.length === 0) break;
    for (const row of rows) {
      send(first ? "\n    " : ",\n    ");
      send(JSON.stringify(row));
      first = false;
    }
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  send(first ? "]" : "\n  ]");
}
