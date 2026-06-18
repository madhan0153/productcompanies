import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/security/cron";
import { runPeriodicPushNotifications } from "@/lib/push/triggers";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro limit

// Daily push sweep — runs every periodic notification category (new matches,
// application reminders, job alerts) for every consented, subscribed user.
// Each category is DPDP-gated, per-category opt-out aware, and watermarked so
// the same nudge never fires twice. See lib/push/triggers.ts.
async function run(req: NextRequest) {
  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const admin = createSupabaseAdminClient();
  const result = await runPeriodicPushNotifications(admin);

  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
