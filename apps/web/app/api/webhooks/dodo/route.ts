import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/billing/dodo";
import { processDodoWebhook } from "@/lib/billing/webhook-processing";
import { logEvent } from "@/lib/observability/log";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";
import type { Json } from "@/lib/supabase/types";

// Dodo sends events via POST with standardwebhooks signature headers.
// We must read the raw body before any JSON parsing so signature validation works.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimitRoute(req, "dodo_webhook_ip", { limit: 120, windowMs: 60_000 });
  if (ipLimit) return ipLimit;

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
    logEvent("warn", "dodo_webhook_signature_failed", {
      error_kind: err instanceof Error ? err.name : "unknown",
    });
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
    logEvent("error", "dodo_webhook_processing_failed", {
      webhook_id_prefix: webhookId.slice(0, 12),
      error_kind: err instanceof Error ? err.name : "unknown",
    });
    // Return 500 so Dodo retries delivery
    return NextResponse.json(
      { error: "processing error" },
      { status: 500 },
    );
  }
}
