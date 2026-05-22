import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { siteOrigin } from "@/lib/seo/site";
import "./globals.css";

// Two-font system: Inter for UI body, Outfit for display (geometric grotesk
// with strong identity at large sizes). Both are loaded via next/font/google
// so they're self-hosted by Vercel — zero CLS, no extra fetch.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "ProdMatch.ai — Match into India's top product companies",
    template: "%s · ProdMatch.ai",
  },
  description:
    "AI-powered, India-first job matching for software engineers. Get explainable matches to high-package roles at 18 verified product companies — sourced from official career pages, refreshed daily.",
  applicationName: "ProdMatch.ai",
  authors: [{ name: "ProdMatch.ai" }],
  keywords: [
    "product based company jobs",
    "product company jobs in india",
    "AI resume matcher for tech jobs",
    "high package software jobs india",
    "bengaluru product company jobs",
    "hyderabad product company jobs",
    "DPDP compliant",
  ],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  openGraph: {
    type: "website",
    siteName: "ProdMatch.ai",
    locale: "en_IN",
    url: siteOrigin(),
    title: "ProdMatch.ai — Match into India's top product companies",
    description: "Explainable AI matches for engineering roles at 18 verified Indian product companies — Google, Razorpay, Swiggy, PhonePe and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProdMatch.ai — India's product-company job engine",
    description: "AI-ranked engineering roles at 18 verified product companies. Free. DPDP-compliant.",
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070912" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        {/* SEO baseline: Organization + WebSite JSON-LD on every page. Both
            target the same `@graph` so they crosslink correctly. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "glass-strong elev-2",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
