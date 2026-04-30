"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, BookOpen, GitCompare,
  Bell, ShieldCheck, LogOut, Menu, X, User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/profile",       label: "My Profile",     icon: User },
  { href: "/matches",       label: "Matches",        icon: Briefcase },
  { href: "/applications",  label: "Applications",   icon: BookOpen },
  { href: "/stories",       label: "Story Bank",     icon: BookOpen },
  { href: "/offers",        label: "Offer Compare",  icon: GitCompare },
  { href: "/alerts",        label: "Alerts",         icon: Bell },
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
  const reduce = useReducedMotion();
  const trapRef = useFocusTrap(open);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Esc closes the mobile sidebar
  useEscapeKey(() => {
    if (open) setOpen(false);
  });

  // Prevent body scroll while mobile sidebar is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Auto-close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Return focus to the menu button when the sidebar closes
  useEffect(() => {
    if (!open) menuButtonRef.current?.focus();
  }, [open]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <aside
        ref={trapRef}
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card/90 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:bg-card/40",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
        aria-modal={open ? "true" : undefined}
        role={open ? "dialog" : undefined}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-lg font-bold text-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            ProdMatch.ai
          </Link>
          <button
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="App sections">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-4 space-y-1">
          <Link
            href="/settings/privacy"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Privacy settings
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
          <div className="px-3 pt-2" aria-label="Signed in as">
            <p className="truncate text-xs font-medium">{user.displayName ?? user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {banner}

        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="sidebar"
            className="rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-sm font-bold text-transparent">
            ProdMatch.ai
          </span>
        </header>

        <motion.main
          id="main-content"
          key={pathname}
          initial={reduce ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-y-auto p-6"
          tabIndex={-1}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
