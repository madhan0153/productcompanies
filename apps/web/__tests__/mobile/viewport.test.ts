import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyPhoneViewport, phoneDesktopViewportCompensation } from "../../lib/mobile/viewport";

test("recognises touch phones even when the browser layout viewport is desktop-sized", () => {
  assert.equal(
    isLikelyPhoneViewport({ maxTouchPoints: 5, screenWidth: 412, screenHeight: 915 }),
    true,
  );
});

test("recognises Chrome desktop-site mode and calculates a readable phone scale", () => {
  const signals = {
    maxTouchPoints: 5,
    screenWidth: 980,
    screenHeight: 1740,
    coarsePointer: true,
    viewportWidth: 980,
    outerWidth: 980,
    outerHeight: 1740,
    devicePixelRatio: 2.625,
  };
  assert.equal(isLikelyPhoneViewport(signals), true);
  const compensation = phoneDesktopViewportCompensation(signals);
  assert.ok(compensation);
  assert.ok(compensation.zoom > 2.5);
  assert.ok(compensation.widthPercent < 40);
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
