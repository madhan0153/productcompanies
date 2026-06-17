"use client";

// Last-resort error boundary. Next renders this only when the ROOT layout
// itself throws — at that point the normal (app)/admin error boundaries and
// even the app's <html>/<body> are unavailable, so this component must supply
// its own document shell and rely on nothing but inline styles (Tailwind /
// design tokens / theme provider may all have failed to mount).
//
// It is intentionally self-contained: no app imports, no external CSS, no
// animation (safe under reduced-motion). The raw error is logged client-side
// for the digest; nothing technical is shown to the user.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", { name: error.name, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b0f1a",
          color: "#e6e8ee",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          role="alert"
          style={{
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "32px 24px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(245, 158, 11, 0.14)",
              color: "#f59e0b",
              fontSize: 24,
              lineHeight: 1,
            }}
          >
            !
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Something went wrong</h1>
          <p
            style={{
              margin: "8px auto 0",
              maxWidth: 320,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#9aa1b2",
            }}
          >
            The app hit an unexpected error. This is usually temporary — please try again.
          </p>
          {error.digest && (
            <p style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              Reference: {error.digest}
            </p>
          )}
          <div
            style={{
              marginTop: 22,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: "none",
                cursor: "pointer",
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 10,
                border: "none",
                background: "#6366f1",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            {/* Plain <a> on purpose: the React tree is broken here, so a hard
                document navigation is more reliable than client-side routing. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "transparent",
                color: "#e6e8ee",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
