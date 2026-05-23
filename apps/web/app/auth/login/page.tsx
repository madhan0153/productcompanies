import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  // SEO: noindex the auth surface — magic-link / OAuth pages have no
  // organic value and waste crawl budget.
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string }>;
}) {
  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — brand / value prop (desktop only) */}
      <div className="relative hidden overflow-hidden bg-secondary/30 lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 hero-gradient" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <Link href="/" className="brand-mark text-xl">
            ProdMatch
          </Link>
        </div>

        {/* Value prop */}
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            India&apos;s premium
            <br />
            <span className="text-primary">product-company</span>
            <br />
            career intelligence.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Upload once. Get explainable, AI-ranked matches to high-package roles at Google, Microsoft, Razorpay, Zerodha and 14 more verified product companies.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              "Official career pages only — no fake listings",
              "Explainable match scores with Fit Cards",
              "DPDP Act 2023 compliant — your data stays private",
              "51 verified product companies, updated daily",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom trust signal */}
        <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          DPDP Act 2023 compliant · No data selling · Right to erasure
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-12">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[400px] hero-gradient lg:hidden" />

        <div className="relative z-10 w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="brand-mark text-xl">ProdMatch</span>
            </div>
            <p className="text-sm text-muted-foreground">India&apos;s top product-company roles, matched to you.</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your career intelligence dashboard.</p>
          </div>

          <LoginForm searchParams={searchParams} />

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.{" "}
            Handled per the <span className="text-primary/80 font-medium">DPDP Act 2023</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
