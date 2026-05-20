import { test, expect } from "@playwright/test";

test.describe("Health check", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("home page loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test("unauthenticated user is redirected to /auth/login from /dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth\/login/);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
