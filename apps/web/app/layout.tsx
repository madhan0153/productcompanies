import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
