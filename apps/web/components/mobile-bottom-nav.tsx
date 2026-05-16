"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, ClipboardList, Compass, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sprint 4 — Item 23. Persistent bottom navigation for mobile widths.
//
// Shown on `<lg` (Tailwind's lg = 1024px). The desktop sidebar is hidden
// at the same breakpoint by AppShell, so this is the primary nav on phones
// and tablets in portrait. Keeps the user's most-used five destinations
// always one tap away.
//
// A11y: aria-label per link, aria-current="page" on the active route.
// Layout: 5-column grid; uses CSS env(safe-area-inset-bottom) so the bar
// sits above the iPhone home indicator.

const BOTTOM_NAV = [
  { href: "/dashboard",    label: "Home",     icon: LayoutDashboard },
  { href: "/matches",      label: "Matches",  icon: Briefcase },
  { href: "/applications", label: "Apps",     icon: ClipboardList },
  { href: "/coach",        label: "Coach",    icon: Compass },
  { href: "/profile",      label: "Profile",  icon: User },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/60 bg-card/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
            {active && (
              <span aria-hidden className="absolute -top-px h-0.5 w-8 rounded-b-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
