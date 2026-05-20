import { NextResponse, type NextRequest } from "next/server";

type CronAuthFailure = {
  status: 401 | 503;
  body: { error: string };
};

export function getCronAuthFailure(authHeader: string | null, configuredSecret?: string | null): CronAuthFailure | null {
  const secret = arguments.length >= 2 ? configuredSecret : process.env.CRON_SECRET;
  if (!secret) {
    return { status: 503, body: { error: "Cron secret is not configured." } };
  }
  if (authHeader !== `Bearer ${secret}`) {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  return null;
}

export function requireCronAuth(req: NextRequest): NextResponse | null {
  const failure = getCronAuthFailure(req.headers.get("authorization"));
  return failure ? NextResponse.json(failure.body, { status: failure.status }) : null;
}

export function requireCronSecret(): string {
  if (!process.env.CRON_SECRET) {
    throw new Error("CRON_SECRET is not configured");
  }
  return process.env.CRON_SECRET;
}
