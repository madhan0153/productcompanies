import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
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
  title: {
    default: "ProdMatch.ai — Match into India's top product companies",
    template: "%s · ProdMatch.ai",
  },
  description:
    "AI-powered, India-first job matching for software engineers. Get explainable matches to high-package roles at the world's top product companies — directly from official career pages.",
  applicationName: "ProdMatch.ai",
  authors: [{ name: "ProdMatch.ai" }],
  keywords: [
    "India software jobs",
    "product companies",
    "AI job matching",
    "high package engineering jobs",
    "DPDP compliant",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "ProdMatch.ai",
    locale: "en_IN",
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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
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
