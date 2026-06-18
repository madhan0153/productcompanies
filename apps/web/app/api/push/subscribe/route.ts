import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

// Mirrors the browser PushSubscription.toJSON() shape.
const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // DPDP gate — a stored push subscription requires an active consent record.
  const { data: consent } = await supabase
    .from("consents")
    .select("granted")
    .eq("user_id", user.id)
    .eq("purpose", "notifications")
    .eq("granted", true)
    .limit(1);
  if (!consent?.length) {
    return NextResponse.json({ error: "Notifications consent required" }, { status: 403 });
  }

  const parsed = SubscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const deviceName = userAgent
    ? /iPhone|iPad/i.test(userAgent)
      ? "Safari on iOS"
      : /Android/i.test(userAgent)
        ? "Browser on Android"
        : /Edg\//i.test(userAgent)
          ? "Microsoft Edge"
          : /Firefox\//i.test(userAgent)
            ? "Mozilla Firefox"
            : /Chrome\//i.test(userAgent)
              ? "Google Chrome"
              : /Safari\//i.test(userAgent)
                ? "Safari"
                : "Web browser"
    : "Web browser";

  // Upsert on endpoint — re-subscribing the same browser refreshes its keys and
  // re-activates a previously retired row. RLS guarantees user-scoping.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
      device_name: deviceName,
      disabled_at: null,
      failure_count: 0,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }

  await notifyUser(user.id, {
    type: "security",
    title: "Push notifications enabled",
    body: "A browser was added to your ProdMatch notification devices.",
    url: "/settings/privacy",
    priority: "important",
    idempotencyKey: `push_subscription_added:${createHash("sha256").update(endpoint).digest("hex").slice(0, 24)}`,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
