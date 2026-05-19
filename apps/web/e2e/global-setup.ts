import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = "./e2e/.auth/user.json";

/**
 * Authenticates a test user via Supabase admin magic-link generation,
 * completes the consent gate if present, then saves the browser session
 * to e2e/.auth/user.json for reuse by all authenticated test projects.
 *
 * Required env vars (in addition to the normal app vars):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_EMAIL  (defaults to e2e-test@prodmatch.ai)
 */
setup("authenticate", async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run E2E tests",
    );
  }

  const email = process.env.E2E_TEST_EMAIL ?? "e2e-test@prodmatch.ai";
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  // Admin client — service role bypasses RLS, not persisted in browser
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure the test user exists (create idempotently)
  const { data: listData } = await admin.auth.admin.listUsers();
  const exists = listData?.users.some((u) => u.email === email);
  if (!exists) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr) throw new Error(`Failed to create test user: ${createErr.message}`);
  }

  // Generate a one-time magic link for the test user
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });
  if (linkErr || !linkData.properties?.action_link) {
    throw new Error(`Failed to generate magic link: ${linkErr?.message}`);
  }

  // Follow the magic link — Supabase sets the auth cookie via the /auth/callback redirect
  await page.goto(linkData.properties.action_link);

  // Wait for redirect to either consent gate or dashboard
  await page.waitForURL(/\/(consent|dashboard)/, { timeout: 15_000 });

  // Complete the consent gate if the user hits it on first login
  if (page.url().includes("/consent")) {
    // Check all consent checkboxes (account, matching, digest_email, analytics)
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) await cb.click();
    }
    await page.getByRole("button", { name: /continue|get started/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }

  await expect(page).toHaveURL(/\/dashboard/);

  // Ensure the directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  // Persist session for all authenticated test projects
  await page.context().storageState({ path: AUTH_FILE });
});
