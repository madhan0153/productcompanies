// Shared shell for every /admin/* page. Provides:
//   - The auth gate (notFound() for non-admins so the surface area isn't leaked).
//   - The mobile-first AdminNav at the top.
//   - The PM design system: Geist + Geist Mono fonts, tokens.css scoped under
//     .pm-shell so the warm-cream admin palette doesn't leak into marketing.
//
// Per-page chrome (max-width wrappers, page-specific headers) stays inside
// each page.tsx — the layout intentionally does not add another container
// so existing pages don't double-wrap.

import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import "@/components/admin/pm-tokens.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Geist for UI body, Geist Mono for numerics / code samples / receipt IDs.
// Loaded via next/font so they're self-hosted by Vercel — zero CLS, no extra fetch.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdmin();
  if (!gate.isAdmin) notFound();

  return (
    <div className={`pm-shell min-h-screen ${geist.variable} ${geistMono.variable}`}>
      <AdminNav email={gate.email} />
      <main className="md:pl-72">{children}</main>
    </div>
  );
}
