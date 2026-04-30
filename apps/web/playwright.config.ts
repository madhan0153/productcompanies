import { defineConfig, devices } from "@playwright/test";

/**
 * Run tests against a local dev server by default.
 * In CI, set PLAYWRIGHT_BASE_URL to the preview deployment URL and
 * start the server separately before running Playwright.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? "github" : "html",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    // Step 1: authenticate once and save browser state
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Public routes — no auth needed
    {
      name: "public",
      testMatch: /\.(public|health|auth)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Authenticated routes — depend on setup to have run first
    {
      name: "authenticated",
      testMatch: /\.(dashboard|golden-path|applications|privacy)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Start the dev server automatically in local mode
  webServer: IS_CI
    ? undefined
    : {
        command: "pnpm dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
