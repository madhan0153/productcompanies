import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/billing/dodo";
import { processDodoWebhook } from "@/lib/billing/webhook-processing";
import type { Json } from "@/lib/supabase/types";

// Dodo sends events via POST with standardwebhooks signature headers.
// We must read the raw body before any JSON parsing so signature validation works.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  let event;
  try {
    event = verifyDodoWebhook(rawBody, req.headers);
  } catch (err) {
    console.error("[webhook/dodo] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const webhookId = req.headers.get("webhook-id") ?? `${event.type}:${Date.now()}`;

  try {
    const result = await processDodoWebhook({
      webhookId,
      eventType:  event.type,
      payload:    event as unknown as Json,
    });

    if (result.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({ received: true, userId: result.userId });
  } catch (err) {
    console.error("[webhook/dodo] processing error:", err);
    // Return 500 so Dodo retries delivery
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "processing error" },
      { status: 500 },
    );
  }
}
