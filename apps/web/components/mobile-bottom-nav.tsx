"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, ClipboardList, Compass, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Persistent bottom navigation for mobile widths.
//
// Shown on `<lg` (Tailwind's lg = 1024px). The desktop sidebar is hidden
// at the same breakpoint by AppShell, so this is the primary nav on phones
// and tablets in portrait. Five most-used destinations, always one tap away.
//
// Touch target: each link is ≥56px tall (Apple HIG asks for ≥44px; we go
// taller for comfort given the bar sits in the thumb zone). Active state
// is a top border line + tinted icon/text — no decorative blobs.

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
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
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
              "relative flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-medium transition tap-target focus:outline-none focus-visible:bg-secondary",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground active:bg-secondary/60",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary"
              />
            )}
            <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.25 : 2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
