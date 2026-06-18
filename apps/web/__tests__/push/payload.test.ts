import test from "node:test";
import assert from "node:assert/strict";
import { PushPayloadSchema, safeNotificationPath } from "../../lib/push/payload";
import { getKindFrequency } from "../../lib/push/catalog";

test("push payload accepts safe app-relative deep links", () => {
  const payload = PushPayloadSchema.parse({
    type: "job_matches",
    title: "New match",
    url: "/jobs/123?from=push",
    data: { count: 1 },
  });
  assert.equal(payload.url, "/jobs/123?from=push");
});

test("push payload rejects external and protocol-relative links", () => {
  assert.throws(() =>
    PushPayloadSchema.parse({ type: "security", title: "Alert", url: "https://evil.example" }),
  );
  assert.equal(safeNotificationPath("//evil.example"), "/dashboard");
});

test("push payload rejects sensitive arbitrary data fields", () => {
  assert.throws(() =>
    PushPayloadSchema.parse({
      type: "job_matches",
      title: "New match",
      data: { salary: "40 LPA" },
    }),
  );
});

test("notification frequency defaults and explicit opt-out are stable", () => {
  assert.equal(getKindFrequency(null, "job_matches"), "immediate");
  assert.equal(getKindFrequency({ job_matches: "disabled" }, "job_matches"), "disabled");
  assert.equal(getKindFrequency({ job_matches: "unexpected" }, "job_matches"), "immediate");
});
