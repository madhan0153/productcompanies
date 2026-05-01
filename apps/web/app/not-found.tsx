import Link from "next/link";
import { Compass, Home, Briefcase } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      {/* Soft gradient background, matches the hero language */}
      <div aria-hidden className="absolute inset-0 gradient-mesh" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none" />

      <div className="relative z-10 max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 backdrop-blur">
          <Compass className="h-8 w-8 text-primary" aria-hidden />
        </div>

        <p className="font-display text-7xl font-bold gradient-text">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          You&apos;ve gone off the map
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist — or the role it pointed to has been pulled from the official career page.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="press inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/30 transition hover:opacity-90 focus-ring"
          >
            <Home className="h-4 w-4" /> Back home
          </Link>
          <Link
            href="/matches"
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-card focus-ring"
          >
            <Briefcase className="h-4 w-4" /> View matches
          </Link>
        </div>
      </div>
    </main>
  );
}
