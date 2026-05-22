"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, ClipboardList, Brain, User,
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
  { href: "/dashboard",    label: "Home",     icon: LayoutDashboard, badgeKey: null              },
  { href: "/matches",      label: "Matches",  icon: Briefcase,       badgeKey: "matches"      as const },
  { href: "/applications", label: "Apps",     icon: ClipboardList,   badgeKey: "applications" as const },
  { href: "/dsa",          label: "DSA",      icon: Brain,           badgeKey: null              },
  { href: "/profile",      label: "Profile",  icon: User,            badgeKey: null              },
] as const;

export function MobileBottomNav({ badges }: { badges?: { matches?: number; applications?: number } }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {BOTTOM_NAV.map(({ href, label, icon: Icon, badgeKey }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));
        const badgeCount = badgeKey ? badges?.[badgeKey] ?? 0 : 0;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            aria-label={badgeCount > 0 ? `${label} — ${badgeCount} item${badgeCount === 1 ? "" : "s"} need attention` : label}
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
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.25 : 2} />
              {/* Sprint 6 — subtle dot for unseen strong fits / stuck apps */}
              {badgeCount > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute -right-1.5 -top-1 inline-flex min-w-[14px] h-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none tabular-nums ring-2 ring-background",
                    badgeKey === "applications" ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground",
                  )}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
