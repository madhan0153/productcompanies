// /robots.txt — Next.js File-based metadata.
//
// Allow Googlebot + other reputable crawlers on the public surface.
// Disallow personalised app routes, admin, API, and the OAuth flow.

import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/companies",
          "/companies/",
          "/cities",
          "/cities/",
          "/roles",
          "/roles/",
          "/listings/",
          "/about",
          "/privacy",
          "/terms",
          "/dsa",                // public DSA index (kept public when not logged in)
          "/dsa/patterns",
        ],
        disallow: [
          "/dashboard",
          "/matches",
          "/profile",
          "/applications",
          "/applications/",
          "/insights",
          "/coach",
          "/settings",
          "/settings/",
          "/jobs/",              // authenticated detail URL — public mirror lives at /listings/
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/consent",
          "/unsubscribe",
          "/lab",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
