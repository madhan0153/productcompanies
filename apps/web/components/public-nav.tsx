// Shared header for public SEO pages. Mobile-first (sticky top, compact
// 56px height, single-line nav). Server component — no client-only deps.

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 focus-ring rounded-md">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="brand-mark text-base">ProdMatch</span>
        </Link>
        <nav className="flex items-center gap-1 text-xs sm:text-sm" aria-label="Primary">
          <Link
            href="/companies"
            className="hidden min-h-9 items-center rounded-md px-2 font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex"
          >
            Companies
          </Link>
          <Link
            href="/cities"
            className="hidden min-h-9 items-center rounded-md px-2 font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex"
          >
            Cities
          </Link>
          <Link
            href="/roles"
            className="hidden min-h-9 items-center rounded-md px-2 font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:inline-flex"
          >
            Roles
          </Link>
          <Link
            href="/auth/login"
            className="ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
