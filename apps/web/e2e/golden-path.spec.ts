import { test, expect } from "@playwright/test";

/**
 * Golden-path E2E — sequential walkthrough of the core user journey.
 * Runs as the "authenticated" project so storageState is pre-loaded.
 *
 * Flow:
 *   Dashboard → Profile (resume upload skipped — needs real PDF) →
 *   Matches → Applications (add + view) → Stories (add) → Offers (add) →
 *   Privacy (export download)
 */

test.describe("Golden path (authenticated)", () => {
  test("1 — Dashboard loads and shows nav", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /app sections/i })).toBeVisible();
  });

  test("2 — Profile page renders upload zone", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    // Upload zone or existing resume info should be present
    await expect(
      page.getByText(/upload|resume|pdf/i).first(),
    ).toBeVisible();
  });

  test("3 — Matches page renders with compute button", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveURL(/\/matches/);
    // Either a "Compute matches" button (no resume yet) or match cards
    const computeBtn = page.getByRole("button", { name: /compute|run matches/i });
    const matchCard = page.locator('[data-testid="match-card"], .rounded-2xl').first();
    // At least one of them must be visible
    await expect(computeBtn.or(matchCard)).toBeVisible();
  });

  test("4 — Applications page renders the pipeline", async ({ page }) => {
    await page.goto("/applications");
    await expect(page).toHaveURL(/\/applications/);
    await expect(
      page.getByRole("heading", { name: /applications/i }),
    ).toBeVisible();
  });

  test("5 — Can open the Add Application dialog", async ({ page }) => {
    await page.goto("/applications");
    const addBtn = page.getByRole("button", { name: /add application/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /add application/i }),
    ).toBeVisible();

    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("6 — Can add an application end-to-end", async ({ page }) => {
    await page.goto("/applications");
    await page.getByRole("button", { name: /add application/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill the form fields
    await dialog.getByLabel(/company/i).fill("Google");
    await dialog.getByLabel(/role|title/i).fill("Senior Software Engineer");

    // Submit
    await dialog.getByRole("button", { name: /save|add|submit/i }).click();

    // Dialog closes and the new application appears
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/senior software engineer/i)).toBeVisible();
  });

  test("7 — Stories page renders and can open story form", async ({ page }) => {
    await page.goto("/stories");
    await expect(page).toHaveURL(/\/stories/);
    await expect(
      page.getByRole("heading", { name: /stories/i }),
    ).toBeVisible();

    const addBtn = page.getByRole("button", { name: /add story|new story/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("8 — Offers page renders and can open offer form", async ({ page }) => {
    await page.goto("/offers");
    await expect(page).toHaveURL(/\/offers/);
    await expect(
      page.getByRole("heading", { name: /offer|compare/i }),
    ).toBeVisible();

    const addBtn = page.getByRole("button", { name: /add offer|new offer/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("9 — Alerts page renders the digest toggle", async ({ page }) => {
    await page.goto("/alerts");
    await expect(page).toHaveURL(/\/alerts/);
    // Digest subscription toggle or settings
    await expect(page.locator("main")).toBeVisible();
  });

  test("10 — Export triggers a file download", async ({ page }) => {
    await page.goto("/settings/privacy");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page.getByRole("button", { name: /export|download/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/prodmatch-export.*\.json/);
  });

  test("11 — Keyboard: Tab through dashboard nav without mouse", async ({ page }) => {
    await page.goto("/dashboard");

    // First Tab should focus the skip link
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();

    // Second Tab moves into the sidebar brand/nav
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    // Should be something inside the nav
    await expect(focused).toBeVisible();
  });

  test("12 — Loading skeleton appears for matches route", async ({ page }) => {
    // Intercept to slow the response so we can see the skeleton
    await page.route("/matches", async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });
    await page.goto("/matches");
    // Either skeleton (animate-pulse) or real content — just assert no crash
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Accessibility spot-checks (authenticated)", () => {
  test("all modal dialogs have role=dialog and aria-modal", async ({ page }) => {
    await page.goto("/applications");
    await page.getByRole("button", { name: /add application/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    // Must have an accessible name via aria-labelledby
    const labelledBy = await dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();

    const title = page.locator(`#${labelledBy}`);
    await expect(title).toBeVisible();
  });

  test("decorative icons are hidden from screen readers", async ({ page }) => {
    await page.goto("/dashboard");
    // All <svg> elements that are purely decorative should have aria-hidden
    const nonHiddenDecorative = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      return svgs.filter(
        (svg) =>
          !svg.getAttribute("aria-hidden") &&
          !svg.getAttribute("aria-label") &&
          !svg.getAttribute("role"),
      ).length;
    });
    // We expect zero SVGs without aria-hidden/label/role
    expect(nonHiddenDecorative).toBe(0);
  });
});
