"use client";

// Error boundary for the entire /admin subtree. A failed server query on any
// admin page now renders a graceful, on-brand recovery card (retry + back)
// instead of falling through to the global app error page. Rendered inside
// AdminLayout, so .pm-shell tokens apply. The raw error is logged, never shown
// — admin internals must not leak into the UI.

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ChevronLeft } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px" }}>
      <div
        role="alert"
        style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)", padding: 24, boxShadow: "var(--shadow-1)",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 48, height: 48, margin: "0 auto", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--err-soft)", color: "var(--err)",
        }}>
          <AlertTriangle size={22} />
        </div>
        <h1 style={{ marginTop: 14, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
          Something went wrong
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
          This admin view failed to load. It&apos;s usually transient — retry, or head back to the overview.
        </p>
        {error.digest && (
          <p className="pm-mono" style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
            ref {error.digest}
          </p>
        )}
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <button type="button" onClick={() => reset()} className="pm-cta">
            <RefreshCw size={15} /> Try again
          </button>
          <Link href="/admin" className="pm-cta pm-cta-secondary">
            <ChevronLeft size={15} /> Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
