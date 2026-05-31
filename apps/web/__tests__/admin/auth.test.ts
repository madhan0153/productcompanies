// Unit tests for the ADMIN_EMAILS allowlist parser.
// Runs under: node --import tsx --test apps/web/__tests__/admin/auth.test.ts

import "../_env-stub";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdminAllowlist } from "../../lib/admin/auth";

test("parseAdminAllowlist — unset / empty / whitespace-only returns empty", () => {
  assert.deepEqual(parseAdminAllowlist(undefined), []);
  assert.deepEqual(parseAdminAllowlist(null), []);
  assert.deepEqual(parseAdminAllowlist(""), []);
  assert.deepEqual(parseAdminAllowlist("   "), []);
  assert.deepEqual(parseAdminAllowlist(",, ,,"), []);
});

test("parseAdminAllowlist — single email lowercases and trims", () => {
  assert.deepEqual(parseAdminAllowlist("  Founder@Company.COM  "), ["founder@company.com"]);
});

test("parseAdminAllowlist — multi-email splits, trims, lowercases, filters empties", () => {
  const raw = "  A@b.com , c@D.com,,  E@F.co ";
  assert.deepEqual(parseAdminAllowlist(raw), ["a@b.com", "c@d.com", "e@f.co"]);
});

test("parseAdminAllowlist — preserves order (first-listed first)", () => {
  const out = parseAdminAllowlist("z@x.com,a@x.com,m@x.com");
  assert.deepEqual(out, ["z@x.com", "a@x.com", "m@x.com"]);
});

test("parseAdminAllowlist — does not dedup (caller relies on this)", () => {
  // Caller may rely on multiplicity for accidental misconfigs being
  // observable (e.g. someone listed the same email twice). The lookup
  // path (.includes) handles dupes correctly either way.
  assert.deepEqual(parseAdminAllowlist("a@b.com,a@b.com"), ["a@b.com", "a@b.com"]);
});
