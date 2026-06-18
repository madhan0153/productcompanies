import { expect, test } from "@playwright/test";

test.describe("PWA production assets", () => {
  test("manifest is installable and all declared icons load", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = (await response.json()) as {
      id?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      icons?: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(manifest).toMatchObject({
      id: "/",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );

    for (const icon of manifest.icons ?? []) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.ok(), icon.src).toBe(true);
      expect(iconResponse.headers()["content-type"], icon.src).toContain("image/png");
    }
  });

  test("service worker and notification badge are publicly available", async ({
    request,
  }) => {
    const [worker, badge] = await Promise.all([
      request.get("/sw.js"),
      request.get("/icons/badge-96.png"),
    ]);
    expect(worker.ok()).toBe(true);
    expect(worker.headers()["content-type"]).toContain("application/javascript");
    expect(await worker.text()).toContain('badge: "/icons/badge-96.png"');
    expect(badge.ok()).toBe(true);
    expect(badge.headers()["content-type"]).toContain("image/png");
  });
});
