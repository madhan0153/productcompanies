import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(process.cwd(), "apps/web");

function source(path: string): string {
  return readFileSync(resolve(webRoot, path), "utf8");
}

test("Dodo checkout explicitly requests INR and absorbs adaptive-currency fees", () => {
  const dodo = source("lib/billing/dodo.ts");
  assert.match(dodo, /billing_currency:\s*"INR"/);
  assert.match(dodo, /adaptive_currency_fees_inclusive:\s*true/);
});

test("return sync proves ownership with the server-created checkout nonce", () => {
  const successPage = source("app/billing/success/page.tsx");
  const syncRoute = source("app/api/billing/sync/route.ts");
  assert.match(successPage, /subscription_id:\s*subId,[\s\S]*session,/);
  assert.match(syncRoute, /\.eq\("return_nonce", checkoutNonce\)/);
  assert.match(syncRoute, /ownsByCheckoutSession/);
});

test("webhooks recover a user from checkout metadata when provider user metadata is absent", () => {
  const webhook = source("lib/billing/webhook-processing.ts");
  assert.match(webhook, /stringValue\(metadata, \["session_nonce"\]\)/);
  assert.match(webhook, /\.from\("billing_checkout_sessions"\)[\s\S]*\.eq\("return_nonce", sessionNonce\)/);
});

test("pending confirmation does not imply activation succeeded", () => {
  const successPage = source("app/billing/success/page.tsx");
  assert.match(successPage, /Check activation again/);
  assert.match(successPage, /Return to dashboard without activation/);
  assert.match(successPage, /setRetryAttempt\(\(attempt\) => attempt \+ 1\)/);
});

test("admin reconciliation auto-detects the paid account before requiring manual identity", () => {
  const reconcile = source("lib/admin/actions/reconcile.ts");
  const form = source("app/admin/billing/reconcile/client.tsx");
  assert.match(reconcile, /Fetch Dodo first/);
  assert.match(reconcile, /addAuthCandidate\("Dodo metadata"/);
  assert.match(reconcile, /addAuthCandidate\("Dodo customer email"/);
  assert.match(reconcile, /\.from\("billing_checkout_sessions"\)/);
  assert.match(reconcile, /Account mismatch:/);
  assert.match(form, /ProdMatch email or user id \(optional\)/);
  assert.doesNotMatch(form, /name="emailOrId" required/);
});

test("subscription persistence avoids PostgREST partial-index conflict inference", () => {
  const persistence = source("lib/billing/subscriptions.ts");
  const reconcile = source("lib/admin/actions/reconcile.ts");
  const sync = source("app/api/billing/sync/route.ts");
  const webhook = source("lib/billing/webhook-processing.ts");
  assert.match(persistence, /select\("id"\)/);
  assert.match(persistence, /\.update\(values\)/);
  assert.match(persistence, /\.insert\(values\)/);
  assert.doesNotMatch(persistence, /onConflict/);
  assert.match(reconcile, /persistProviderSubscription/);
  assert.match(sync, /persistProviderSubscription/);
  assert.match(webhook, /persistProviderSubscription/);
});
