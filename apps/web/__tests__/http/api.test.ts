// Unit tests for the centralized API error/response helpers.
// Runs under: node --import tsx --test apps/web/__tests__/http/api.test.ts

import "../_env-stub";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newRequestId,
  ApiError,
  apiError,
  unauthorized,
  badRequest,
  serverError,
  tooManyRequests,
  safeRoute,
} from "../../lib/http/api";

test("newRequestId — short, string, and unique per call", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.equal(typeof a, "string");
  assert.ok(a.length >= 6 && a.length <= 12);
  assert.notEqual(a, b);
});

test("apiError — body carries error/code/requestId and echoes X-Request-Id", async () => {
  const res = apiError(400, "Nope", { code: "bad" });
  assert.equal(res.status, 400);
  const rid = res.headers.get("x-request-id");
  assert.ok(rid);
  const body = await res.json();
  assert.equal(body.error, "Nope");
  assert.equal(body.code, "bad");
  assert.equal(body.requestId, rid);
});

test("apiError — omits code key entirely when not provided", async () => {
  const body = await apiError(500, "x").json();
  assert.equal("code" in body, false);
});

test("unauthorized / badRequest / serverError — correct status + code", async () => {
  assert.equal(unauthorized().status, 401);
  assert.equal((await unauthorized().json()).code, "unauthorized");
  assert.equal(badRequest().status, 400);
  assert.equal((await badRequest().json()).code, "bad_request");
  assert.equal(serverError().status, 500);
  assert.equal((await serverError().json()).code, "internal_error");
});

test("tooManyRequests — sets a ceil'd Retry-After header", () => {
  const res = tooManyRequests(12.3);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "13");
});

test("safeRoute — passes a normal handler response through untouched", async () => {
  const handler = safeRoute("t.ok", async () => new Response("hi", { status: 201 }));
  const res = await handler();
  assert.equal(res.status, 201);
  assert.equal(await res.text(), "hi");
});

test("safeRoute — maps a thrown ApiError to its status and safe message", async () => {
  const handler = safeRoute("t.api", async () => {
    throw new ApiError(404, "missing", "Not found.");
  });
  const res = await handler();
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, "Not found.");
  assert.equal(body.code, "missing");
});

test("safeRoute — converts an unexpected throw into a safe 500 without leaking internals", async () => {
  const handler = safeRoute("t.boom", async () => {
    throw new Error("postgres://user:secret@db.internal/prod failed");
  });
  const res = await handler();
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.code, "internal_error");
  assert.ok(body.requestId);
  assert.ok(!/postgres|secret|internal/.test(body.error));
});
