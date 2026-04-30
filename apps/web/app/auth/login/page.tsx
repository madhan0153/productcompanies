import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string; email?: string }>;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-cyan-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            ProdMatch.ai
          </span>
          <p className="mt-1 text-sm text-muted-foreground">India&apos;s top product company roles, matched to you.</p>
        </div>

        <LoginForm searchParams={searchParams} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in you agree to our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">Terms</a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
          <br />
          Your data is handled per the{" "}
          <span className="text-primary/80">DPDP Act 2023</span>.
        </p>
      </div>
    </div>
  );
}
