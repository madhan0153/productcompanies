import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonObject } from "./json";

test("parseJsonObject accepts raw JSON", () => {
  assert.deepEqual(parseJsonObject<{ ok: boolean }>('{"ok":true}'), { ok: true });
});

test("parseJsonObject accepts fenced JSON from weaker providers", () => {
  assert.deepEqual(
    parseJsonObject<{ ok: boolean }>("```json\n{\"ok\":true}\n```"),
    { ok: true },
  );
});

test("parseJsonObject extracts object when provider adds prose", () => {
  assert.deepEqual(
    parseJsonObject<{ ok: boolean }>("Sure, here is the JSON:\n{\"ok\":true}\nDone."),
    { ok: true },
  );
});
