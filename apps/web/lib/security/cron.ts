import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

type CronAuthFailure = {
  status: 401 | 503;
  body: { error: string };
};

/**
 * Bearer-only cron auth. Used by every public cron endpoint as the
 * minimum gate. Constant-time comparison via Buffer-aware equality.
 */
export function getCronAuthFailure(authHeader: string | null, configuredSecret?: string | null): CronAuthFailure | null {
  const secret = arguments.length >= 2 ? configuredSecret : process.env.CRON_SECRET;
  if (!secret) {
    return { status: 503, body: { error: "Cron secret is not configured." } };
  }
  const expected = `Bearer ${secret}`;
  if (!authHeader || !constantTimeStringEqual(authHeader, expected)) {
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

/**
 * Security fix (S-8): additional HMAC verification for sensitive cron
 * sub-modes (e.g. ad-hoc per-user recompute). A leaked CRON_SECRET alone
 * is not enough — caller must also send an HMAC over the request body
 * + a freshness timestamp. Tampering with either invalidates the HMAC.
 *
 * Header contract:
 *   x-prodmatch-cron-ts:    unix seconds when the request was signed
 *   x-prodmatch-cron-sig:   hex(HMAC_SHA256(secret, `${ts}.${body}`))
 *
 * The freshness window is 5 minutes either side of server time. Replays
 * outside that window are rejected.
 */
export type SensitiveCronAuthOutcome =
  | { ok: true }
  | { ok: false; status: 400 | 401 | 403 | 503; body: { error: string } };

export function verifySensitiveCronAuth(input: {
  authHeader: string | null;
  tsHeader: string | null;
  sigHeader: string | null;
  rawBody: string;
}): SensitiveCronAuthOutcome {
  const baseAuth = getCronAuthFailure(input.authHeader);
  if (baseAuth) return { ok: false, status: baseAuth.status, body: baseAuth.body };

  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 503, body: { error: "Cron secret is not configured." } };

  if (!input.tsHeader || !/^\d{10,13}$/.test(input.tsHeader)) {
    return { ok: false, status: 400, body: { error: "Missing or malformed x-prodmatch-cron-ts" } };
  }
  if (!input.sigHeader || !/^[a-f0-9]{64}$/.test(input.sigHeader)) {
    return { ok: false, status: 400, body: { error: "Missing or malformed x-prodmatch-cron-sig" } };
  }

  const ts = Number(input.tsHeader);
  const seconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
  const skewSeconds = Math.abs(Math.floor(Date.now() / 1000) - seconds);
  if (skewSeconds > 300) {
    return { ok: false, status: 403, body: { error: "Request signature is too old or too new" } };
  }

  const expected = createHmac("sha256", secret)
    .update(`${input.tsHeader}.${input.rawBody}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(input.sigHeader, "hex");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, status: 401, body: { error: "Invalid HMAC signature" } };
  }
  return { ok: true };
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
