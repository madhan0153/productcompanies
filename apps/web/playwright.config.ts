import { defineConfig, devices, type Project } from "@playwright/test";

/**
 * Run tests against a local dev server by default.
 * In CI, set PLAYWRIGHT_BASE_URL to the preview deployment URL and
 * start the server separately before running Playwright.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const IS_CI = !!process.env.CI;
const HAS_AUTH_E2E_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

if (process.env.E2E_AUTH_REQUIRED === "1" && !HAS_AUTH_E2E_ENV) {
  throw new Error(
    "E2E_AUTH_REQUIRED=1 requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

const projects: Project[] = [
  // Public routes — no service-role e2e env needed.
  {
    name: "public",
    testMatch: /(public|health|auth)\.spec\.ts/,
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "mobile-public",
    testMatch: /(public|health|auth)\.spec\.ts/,
    use: { ...devices["Pixel 5"] },
  },
];

if (HAS_AUTH_E2E_ENV) {
  projects.push(
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /(dashboard|golden-path|applications|privacy)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-authenticated",
      testMatch: /(dashboard|golden-path|applications|privacy)\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  );
}

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

  projects,

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
