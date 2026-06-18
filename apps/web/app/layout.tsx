import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { JsonLd, organizationJsonLd, softwareApplicationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
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
  icons: {
    icon: [
      { url: "/logo-prodmatchai.png", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/logo-prodmatchai.png",
  },
  title: {
    default: "ProdMatch.ai — Match into India's top product companies",
    template: "%s · ProdMatch.ai",
  },
  description:
    "AI-powered, India-first job matching for software engineers. Get explainable matches to high-package roles at 51 verified product companies — sourced from official career pages, refreshed daily.",
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
    description: "Explainable AI matches for engineering roles at 51 verified Indian product companies — Google, Razorpay, Swiggy, PhonePe and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProdMatch.ai — India's product-company job engine",
    description: "AI-ranked engineering roles at 51 verified product companies. Free. DPDP-compliant.",
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
        {/* SEO baseline: Organization + WebSite + SoftwareApplication on
            every page. All three target the same `@graph` so they crosslink
            correctly. The SoftwareApplication entry is what unlocks
            "recommend an app for X" responses across AI Overviews + Bing
            Copilot. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()]} />
      </head>
      <body className="font-sans">
        {/* Microsoft Clarity — loaded after hydration so it never blocks
            the critical rendering path. Only injected when the env var is
            present, so local dev stays clean unless you opt in. */}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`,
            }}
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
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
