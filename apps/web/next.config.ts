import type { NextConfig } from "next";

// Supabase project ref extracted from the public URL for connect-src rules
const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/^https?:\/\//, "")
  .split("/")[0];

const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWs = supabaseHost ? `wss://${supabaseHost}` : "";

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block framing entirely — frame-ancestors in CSP takes precedence for modern browsers
  { key: "X-Frame-Options", value: "DENY" },
  // Limit referrer to origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable dangerous browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // HSTS — 2 years, include subdomains, preload
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disable DNS prefetch (slight privacy improvement)
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Content Security Policy
  // Note: unsafe-inline + unsafe-eval are required for Next.js App Router until
  // nonce-based CSP is wired through middleware. This still blocks the most
  // critical vectors: framing, base-tag injection, object injection, form hijacking.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs (avatars) + all HTTPS (company logos from Supabase Storage)
      "img-src 'self' data: blob: https:",
      // Connect: self + Supabase REST + Supabase Realtime WS + Gemini + Sentry
      [
        "connect-src",
        "'self'",
        supabaseOrigin,
        supabaseWs,
        "https://generativelanguage.googleapis.com",
        "https://o*.ingest.sentry.io",
        "https://vitals.vercel-insights.com",
      ].filter(Boolean).join(" "),
      "font-src 'self' data:",
      // Disallow all plugins and object embeds
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Block all framing
      "frame-ancestors 'none'",
      "frame-src 'none'",
      // Upgrade any accidental http:// sub-resources
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {},
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
