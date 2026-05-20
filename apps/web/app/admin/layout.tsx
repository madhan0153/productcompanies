// Shared shell for every /admin/* page. Provides:
//   - The auth gate (notFound() for non-admins so the surface area isn't leaked).
//   - The mobile-first AdminNav at the top.
//
// Per-page chrome (max-width wrappers, page-specific headers) stays inside
// each page.tsx — the layout intentionally does not add another container
// so existing pages don't double-wrap.

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireAdmin();
  if (!gate.isAdmin) notFound();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav email={gate.email} />
      {children}
    </div>
  );
}
