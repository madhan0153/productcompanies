"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, ShieldCheck, LogOut, Menu, X, User,
  BarChart3, Compass, ClipboardList, Zap, Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/profile",      label: "My Profile",   icon: User },
  { href: "/matches",      label: "Matches",      icon: Briefcase },
  { href: "/coach",        label: "Coach",        icon: Compass },
  { href: "/insights",     label: "Market",       icon: BarChart3 },
  { href: "/applications", label: "Applications", icon: ClipboardList },
];

type Props = {
  user: { email: string; displayName: string | null; dnascore: number | null };
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ user, banner, children }: Props) {
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
  const dnaColor = dnaScore === null ? "text-muted-foreground" :
    dnaScore >= 75 ? "text-emerald-400" :
    dnaScore >= 55 ? "text-amber-400" : "text-sky-400";

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        ref={trapRef}
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
        aria-modal={open ? "true" : undefined}
        role={open ? "dialog" : undefined}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between gap-3 border-b border-border/50 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
            </div>
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-sm font-bold text-transparent">
              ProdMatch.ai
            </span>
          </Link>
          <button
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search / command trigger */}
        <div className="px-2.5 pt-2 pb-1">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-secondary/20 px-3 py-2 text-left text-xs text-muted-foreground/60 transition hover:bg-secondary/40 hover:text-muted-foreground"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="flex-1">Search…</span>
            <kbd className="rounded border border-border/50 bg-secondary/60 px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1" aria-label="App sections">
          <LayoutGroup id="sidebar-nav">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition focus-ring",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/20"
                      transition={reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 400, damping: 35 }}
                      aria-hidden
                    />
                  )}
                  <Icon className="relative h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="relative">{label}</span>
                </Link>
              );
            })}
          </LayoutGroup>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border/50 px-2.5 py-3 space-y-0.5">
          <Link
            href="/settings/privacy"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Privacy
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>

          {/* User identity card */}
          <div className="mt-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user.displayName ?? user.email.split("@")[0]}</p>
                <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
              </div>
              {dnaScore !== null && (
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold tabular-nums ${dnaColor}`}>{dnaScore}</p>
                  <p className="text-[9px] text-muted-foreground">DNA</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Command palette (global) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Main content area ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {banner}

        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border/50 bg-card/80 px-4 backdrop-blur lg:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="sidebar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15">
              <Zap className="h-3 w-3 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-sm font-bold text-transparent">
              ProdMatch.ai
            </span>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto rounded-lg border border-border/40 bg-secondary/20 p-1.5 text-muted-foreground transition hover:bg-secondary/50"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <motion.main
          id="main-content"
          key={pathname}
          initial={reduce ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-y-auto p-5 lg:p-6"
          tabIndex={-1}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
