// Centralized API response + error helpers for Route Handlers.
//
// Why this exists: every route was hand-rolling `NextResponse.json({ error },
// { status })`, so the response shape, the status-code choices, and the
// "log-but-don't-leak" discipline drifted per file. This module gives one
// consistent contract:
//
//   - The JSON error body is `{ error: string, code?: string, requestId }`.
//     `error` stays a plain string so every existing client (which reads
//     `body.error`) keeps working — this is additive, not a breaking change.
//   - Every error response carries a short `requestId`, echoed in the
//     `X-Request-Id` header, so a user-reported failure can be traced to a
//     single structured log line without exposing anything sensitive.
//   - `safeRoute` wraps a handler so an *unexpected* throw can never surface a
//     stack trace or crash the function — it is logged server-side and the
//     caller gets a generic, safe 500 with the same requestId.
//
// User-facing messages are always safe and non-technical; internal detail
// (error name, truncated message) lives only in the server log.

import { NextResponse } from "next/server";
import { logEvent } from "@/lib/observability/log";

/** Short correlation id surfaced to the client and the server log. */
export function newRequestId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

/**
 * Throwable, classified error. Throw this anywhere inside a `safeRoute`
 * handler to return a specific status + safe message; anything else that
 * throws is treated as an unexpected 500.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly publicMessage: string;

  constructor(status: number, code: string, publicMessage: string, opts?: { cause?: unknown }) {
    super(publicMessage, opts);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

type ErrorOpts = {
  code?: string;
  requestId?: string;
  headers?: Record<string, string>;
};

/** Structured JSON error response. `error` is always a string (back-compat). */
export function apiError(status: number, message: string, opts: ErrorOpts = {}): NextResponse {
  const requestId = opts.requestId ?? newRequestId();
  return NextResponse.json(
    // `code: undefined` is dropped by JSON.stringify, so no noise when omitted.
    { error: message, code: opts.code, requestId },
    { status, headers: { "X-Request-Id": requestId, ...opts.headers } },
  );
}

// ── Common cases ─────────────────────────────────────────────────────────
// Thin wrappers so call sites read intent (unauthorized() vs apiError(401,…))
// and the default copy stays consistent across the app.

export const unauthorized = (message = "Please sign in to continue.", opts?: ErrorOpts) =>
  apiError(401, message, { code: "unauthorized", ...opts });

export const badRequest = (message = "That request wasn't valid.", opts?: ErrorOpts) =>
  apiError(400, message, { code: "bad_request", ...opts });

export const serverError = (message = "Something went wrong on our side. Please try again.", opts?: ErrorOpts) =>
  apiError(500, message, { code: "internal_error", ...opts });

export const tooManyRequests = (retryAfterSeconds: number, message?: string, opts?: ErrorOpts) =>
  apiError(429, message ?? "Too many requests. Please try again shortly.", {
    code: "rate_limited",
    headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    ...opts,
  });

/**
 * Wrap a Route Handler so unexpected throws are caught, logged with a
 * requestId, and returned as a safe response. The handler's own returned
 * Response (JSON, streaming, file download, …) is passed through untouched —
 * only thrown errors are intercepted.
 *
 *   export const GET = safeRoute("matches.compute-status", async () => { … });
 */
export function safeRoute<A extends unknown[]>(
  name: string,
  handler: (...args: A) => Promise<Response> | Response,
): (...args: A) => Promise<Response> {
  return async (...args: A): Promise<Response> => {
    const requestId = newRequestId();
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        logEvent("warn", "api_error", {
          route: name,
          code: err.code,
          status: err.status,
          request_id: requestId,
        });
        return apiError(err.status, err.publicMessage, { code: err.code, requestId });
      }
      logEvent("error", "api_unhandled", {
        route: name,
        request_id: requestId,
        error_name: err instanceof Error ? err.name : "unknown",
        // Truncated, never the full payload — enough to trace, nothing sensitive.
        error_message: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
      return serverError(undefined, { requestId });
    }
  };
}
