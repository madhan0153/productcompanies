import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PRODUCTS, PRICING } from "../../lib/billing/catalog";

test("temporary ₹10 verification product is private and grants no entitlement", () => {
  const product = CHECKOUT_PRODUCTS.payment_test_10_inr;
  assert.equal(product.amountInPaise, 1_000);
  assert.equal(PRICING.payment_test.once, 1_000);
  assert.equal(product.plan, null);
  assert.equal(product.creditGrant, undefined);
  assert.equal(product.public, false);
  assert.equal(product.temporary, true);
  assert.equal(product.verificationOnly, true);
});

test("public checkout products are centrally priced in INR paise", () => {
  for (const product of Object.values(CHECKOUT_PRODUCTS)) {
    assert.ok(Number.isInteger(product.amountInPaise));
    assert.ok(product.amountInPaise > 0);
    if (product.public) assert.equal(product.verificationOnly, undefined);
  }
});
