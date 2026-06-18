import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyPhoneViewport } from "../../lib/mobile/viewport";

test("recognises touch phones even when the browser layout viewport is desktop-sized", () => {
  assert.equal(
    isLikelyPhoneViewport({ maxTouchPoints: 5, screenWidth: 412, screenHeight: 915 }),
    true,
  );
});

test("does not force phone layout on tablets, touch laptops, or desktops", () => {
  assert.equal(
    isLikelyPhoneViewport({ maxTouchPoints: 5, screenWidth: 768, screenHeight: 1024 }),
    false,
  );
  assert.equal(
    isLikelyPhoneViewport({ maxTouchPoints: 10, screenWidth: 1366, screenHeight: 768 }),
    false,
  );
  assert.equal(
    isLikelyPhoneViewport({ maxTouchPoints: 0, screenWidth: 390, screenHeight: 844 }),
    false,
  );
});
