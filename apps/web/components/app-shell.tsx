"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, ShieldCheck, LogOut, Menu, X, User,
  BarChart3, Compass, ClipboardList, Zap, Search,
} from "lucide-react";
import { useEffect, useRef, useState, Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { RecordLastVisit } from "@/components/record-last-visit";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/profile",      label: "Profile",      icon: User },
  { href: "/matches",      label: "Matches",      icon: Briefcase },
  { href: "/coach",        label: "Coach",        icon: Compass },
  { href: "/insights",     label: "Market",       icon: BarChart3 },
  { href: "/applications", label: "Applications", icon: ClipboardList },
];

type Props = {
  user: { email: string; displayName: string | null; dnascore: number | null };
  /** Sprint 6 — Mobile bottom-nav badges. Counts of items needing attention. */
  navBadges?: { matches?: number; applications?: number };
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ user, navBadges, banner, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const reduce = useReducedMotion();
  const trapRef = useFocusTrap(open);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(() => { if (open) setOpen(false); });

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { if (!open) menuButtonRef.current?.focus(); }, [open]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = user.displayName
    ? user.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const dnaScore = user.dnascore;
  const dnaColor =
    dnaScore === null ? "text-muted-foreground"
    : dnaScore >= 75 ? "text-success"
    : dnaScore >= 55 ? "text-warning"
    : "text-primary";

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-pop"
      >
        Skip to main content
      </a>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        ref={trapRef}
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-standard lg:static lg:translate-x-0",
          open ? "translate-x-0 shadow-pop" : "-translate-x-full",
        )}
        aria-label="Main navigation"
        aria-modal={open ? "true" : undefined}
        role={open ? "dialog" : undefined}
      >
        {/* Logo + close (mobile) */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md focus-ring tap-target-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" aria-hidden strokeWidth={2.5} />
            </span>
            <span className="brand-mark text-base">ProdMatch</span>
          </Link>
          <button
            className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring lg:hidden tap-target-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search / command trigger */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="App sections">
          <LayoutGroup id="sidebar-nav">
            <ul className="space-y-0.5">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition focus-ring",
                        active
                          ? "text-primary-soft-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-nav-pill"
                          className="absolute inset-0 rounded-md bg-primary-soft"
                          transition={reduce
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 500, damping: 40 }}
                          aria-hidden
                        />
                      )}
                      <Icon className="relative h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} />
                      <span className="relative">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </LayoutGroup>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-0.5">
          <Link
            href="/settings/privacy"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} />
            Privacy
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-ring"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2} />
            Sign out
          </button>

          {/* User identity card */}
          <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{user.displayName ?? user.email.split("@")[0]}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              {dnaScore !== null && (
                <div className="shrink-0 text-right">
                  <p className={cn("text-sm font-semibold tabular-nums", dnaColor)}>{dnaScore}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Command palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Main content area ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {banner}

        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md lg:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="sidebar"
            className="-ml-2 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring tap-target-sm"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 focus-ring rounded-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="brand-mark text-sm">ProdMatch</span>
          </Link>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring tap-target-sm"
            aria-label="Search"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {/* Page transition kept short (130ms) to feel snappy. The previous
            240ms felt laggy on top of an SSR roundtrip — the route was
            ready well before the animation completed. */}
        <motion.main
          id="main-content"
          key={pathname}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8"
          tabIndex={-1}
        >
          {children}
        </motion.main>
      </div>

      <MobileBottomNav badges={navBadges} />
      <PwaInstallPrompt />
      {/* Sprint 6 — session history: pathname-scoped scroll restore +
          recently-visited tracking for the dashboard "Continue" card.
          Both client-only; never touches the network. */}
      <Suspense fallback={null}>
        <RecordLastVisit />
      </Suspense>
    </div>
  );
}
