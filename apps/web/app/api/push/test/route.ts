import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/notify";
import { rateLimitRoute } from "@/lib/security/route-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitRoute(req, "push_test", {
    userId: user.id,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const result = await notifyUser(user.id, {
    type: "security",
    title: "ProdMatch notifications are working",
    body: "This device is ready for useful, privacy-safe alerts.",
    url: "/settings/privacy",
    priority: "important",
    idempotencyKey: `push_test:${user.id}:${Math.floor(Date.now() / 60_000)}`,
    ttlSeconds: 10 * 60,
  });

  return NextResponse.json({
    ok: result.delivered > 0,
    delivered: result.delivered,
    message: result.delivered > 0 ? "Test notification sent." : "No active device accepted the test.",
  });
}
