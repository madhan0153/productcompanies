"use client";

// Mobile-first admin navigation rail.
//
// On phones (default), a horizontally-scrolling pill bar sticks under the
// header so any subpage is one tap away. On desktop (md+) the pills inline
// with the brand mark. Active route is derived from usePathname() — no
// extra prop wiring per page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radar, Activity, ShieldAlert } from "lucide-react";

const TABS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/admin",               label: "Overview",       icon: LayoutDashboard },
  { href: "/admin/crawler-intel", label: "Crawler Intel",  icon: Radar          },
  { href: "/admin/health",        label: "Operations",     icon: Activity       },
];

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              ProdMatch · Admin
            </p>
            {email && (
              <p className="text-[10px] text-muted-foreground/70">
                {email}
              </p>
            )}
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:px-0 sm:pb-0"
        >
          {TABS.map((tab) => {
            const Active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={Active ? "page" : undefined}
                className={`
                  inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium
                  transition-colors motion-reduce:transition-none
                  ${Active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"}
                `}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * Active when the current path equals the tab href, OR starts with it
 * followed by a "/" (so /admin/health/anything still highlights "Health").
 * The /admin tab is special-cased to require exact match — otherwise it
 * would light up on every subpage.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
