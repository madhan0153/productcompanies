import test from "node:test";
import assert from "node:assert/strict";
import { oauthCallbackUrl, safeInternalPath } from "../../lib/auth/redirect";

test("safeInternalPath preserves app routes and rejects redirects", () => {
  assert.equal(safeInternalPath("/matches?tab=strong"), "/matches?tab=strong");
  assert.equal(safeInternalPath("https://evil.example"), "/dashboard");
  assert.equal(safeInternalPath("//evil.example"), "/dashboard");
  assert.equal(safeInternalPath("/\\evil.example"), "/dashboard");
});

test("OAuth callback uses the configured production origin", () => {
  assert.equal(
    oauthCallbackUrl("https://preview.example", "https://prodmatch.ai", "/matches"),
    "https://prodmatch.ai/auth/callback?next=%2Fmatches",
  );
});

test("OAuth callback uses the active origin for local development", () => {
  assert.equal(
    oauthCallbackUrl("http://localhost:3001", "http://localhost:3000", "/dashboard"),
    "http://localhost:3001/auth/callback?next=%2Fdashboard",
  );
});
