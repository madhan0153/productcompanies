import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitShared, ipActionKey, userActionKey } from "./rate-limit";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimitRoute(
  req: NextRequest,
  action: string,
  opts: { limit: number; windowMs: number; userId?: string | null },
): Promise<NextResponse | null> {
  const key = opts.userId
    ? userActionKey(opts.userId, action)
    : ipActionKey(clientIp(req), action);
  const limit = await checkRateLimitShared({
    key,
    limit: opts.limit,
    windowMs: opts.windowMs,
  });
  if (limit.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
  );
}
