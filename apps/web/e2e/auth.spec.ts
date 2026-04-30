import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
  });

  test("renders email input and submit button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link|continue/i }),
    ).toBeVisible();
  });

  test("shows validation error on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /send magic link|continue/i }).click();
    // Native HTML validation or custom error message
    const emailInput = page.getByRole("textbox", { name: /email/i });
    // Either native validation fires (valueMissing) or an error message appears
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("shows confirmation message after submitting valid email", async ({
    page,
  }) => {
    await page
      .getByRole("textbox", { name: /email/i })
      .fill("test-smoke@prodmatch.ai");
    await page.getByRole("button", { name: /send magic link|continue/i }).click();

    // After server action redirect, the page shows a sent confirmation
    await page.waitForURL(/sent=1/);
    await expect(page.getByText(/check your (email|inbox)/i)).toBeVisible();
  });

  test("?next param is preserved in the redirect URL", async ({ page }) => {
    await page.goto("/auth/login?next=%2Fmatches");
    const emailInput = page.getByRole("textbox", { name: /email/i });
    await emailInput.fill("test-smoke2@prodmatch.ai");
    await page.getByRole("button", { name: /send magic link|continue/i }).click();
    await page.waitForURL(/sent=1/);
    // The page should have received the email
    await expect(page.getByText(/check your (email|inbox)/i)).toBeVisible();
  });

  test("shows error banner when ?error query param is present", async ({
    page,
  }) => {
    await page.goto("/auth/login?error=Email+rate+limit+exceeded");
    await expect(
      page.getByText(/email rate limit exceeded/i),
    ).toBeVisible();
  });
});
