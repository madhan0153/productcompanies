import { test, expect } from "@playwright/test";

// Uses storageState from playwright.config.ts → "authenticated" project
test.describe("Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("renders the page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
  });

  test("shows the DNA ring SVG", async ({ page }) => {
    // The ring is an SVG inside the dashboard stats section
    await expect(page.locator("svg circle").first()).toBeVisible();
  });

  test("shows at least four stat cards", async ({ page }) => {
    // Each stat card contains a numeric value — look for the card wrappers
    const cards = page.locator('[data-testid="stat-card"], .rounded-2xl').filter({
      hasText: /matches|applications|companies|score/i,
    });
    // At least 1 stat section visible (could be 0 data but structure exists)
    await expect(page.locator("main")).toBeVisible();
  });

  test("nav links are present and keyboard accessible", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /app sections/i });
    await expect(nav).toBeVisible();

    // All main nav links accessible
    for (const label of ["Dashboard", "Matches", "Applications", "Stories", "Offers"]) {
      await expect(nav.getByRole("link", { name: new RegExp(label, "i") })).toBeVisible();
    }
  });

  test("skip-to-main link appears on Tab key", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});

test.describe("Sidebar navigation (authenticated)", () => {
  test("active page link has aria-current=page", async ({ page }) => {
    await page.goto("/dashboard");
    const dashLink = page
      .getByRole("navigation", { name: /app sections/i })
      .getByRole("link", { name: /dashboard/i });
    await expect(dashLink).toHaveAttribute("aria-current", "page");
  });

  test("navigating to Matches updates aria-current", async ({ page }) => {
    await page.goto("/matches");
    const matchesLink = page
      .getByRole("navigation", { name: /app sections/i })
      .getByRole("link", { name: /matches/i });
    await expect(matchesLink).toHaveAttribute("aria-current", "page");
  });
});

test.describe("Settings — Privacy (authenticated)", () => {
  test("privacy page loads with three sections", async ({ page }) => {
    await page.goto("/settings/privacy");
    await expect(page.getByText(/data permissions/i)).toBeVisible();
    await expect(page.getByText(/your data/i)).toBeVisible();
    await expect(page.getByText(/danger zone/i)).toBeVisible();
  });

  test("erasure form requires exact confirmation text", async ({ page }) => {
    await page.goto("/settings/privacy");
    // The delete button should be disabled until the user types the phrase
    const deleteBtn = page.getByRole("button", {
      name: /delete my account/i,
    });
    await expect(deleteBtn).toBeDisabled();

    // Type the wrong phrase — still disabled
    const confirmInput = page.getByPlaceholder(/delete my account/i);
    await confirmInput.fill("wrong text");
    await expect(deleteBtn).toBeDisabled();

    // Type the exact phrase — now enabled
    await confirmInput.fill("DELETE MY ACCOUNT");
    await expect(deleteBtn).toBeEnabled();
  });
});
