import { NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { vapidPublicKey: clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
