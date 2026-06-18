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
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Matches",       short_name: "Matches",  url: "/matches",      description: "View your ranked matches" },
      { name: "Applications",  short_name: "Apps",     url: "/applications", description: "Track your application pipeline" },
      { name: "Profile",       short_name: "Profile",  url: "/profile",      description: "Update your resume and preferences" },
    ],
  };
}
