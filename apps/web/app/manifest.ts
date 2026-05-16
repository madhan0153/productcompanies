// Sprint 4 — Item 25. PWA web app manifest (Next 16 file-based metadata).
// Next.js generates /manifest.webmanifest from this at build time and adds
// the appropriate <link rel="manifest"> tag to all pages.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProdMatch.ai — India's product-company matchmaker",
    short_name: "ProdMatch",
    description:
      "AI-powered job matching for Indian software engineers — get explainable matches to high-package roles at top product companies.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#070912",
    theme_color: "#070912",
    orientation: "portrait-primary",
    categories: ["productivity", "business"],
    lang: "en-IN",
    // Icons come from the colocated app/icon.tsx + app/apple-icon.tsx routes.
    // Next injects them automatically; we don't list them again here.
    icons: [],
    shortcuts: [
      { name: "Matches",       short_name: "Matches",  url: "/matches",      description: "View your ranked matches" },
      { name: "Applications",  short_name: "Apps",     url: "/applications", description: "Track your application pipeline" },
      { name: "Profile",       short_name: "Profile",  url: "/profile",      description: "Update your resume and preferences" },
    ],
  };
}
