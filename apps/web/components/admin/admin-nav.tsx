"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DatabaseZap,
  FileText,
  LayoutDashboard,
  LibraryBig,
  Settings,
  ShieldAlert,
  Terminal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const NAV_PRIMARY = [
  { href: "/admin",           label: "Overview",      icon: LayoutDashboard },
  { href: "/admin/users",     label: "Users",         icon: Users },
  { href: "/admin/billing",   label: "Billing",       icon: CreditCard },
  { href: "/admin/resumes",   label: "Resumes",       icon: FileText },
  { href: "/admin/jobs",      label: "Jobs & Matches",icon: Briefcase },
  { href: "/admin/analytics", label: "Analytics",     icon: BarChart3 },
  { href: "/admin/content",   label: "Content",       icon: LibraryBig },
  { href: "/admin/settings",  label: "Settings",      icon: Settings },
  { href: "/admin/security",  label: "Security",      icon: ShieldAlert },
] as const;

const NAV_OPS = [
  { href: "/admin/ops",            label: "Ops Console",   icon: Terminal },
  { href: "/admin/crawler-intel",  label: "Crawler Intel", icon: DatabaseZap },
  { href: "/admin/ai-ops",         label: "AI Ops",        icon: BrainCircuit },
  { href: "/admin/health",         label: "Health",        icon: Activity },
] as const;

// Bottom dock shows 5 key items on mobile — action-oriented
const DOCK_ITEMS = [
  NAV_PRIMARY[0], // Overview
  NAV_PRIMARY[1], // Users
  NAV_PRIMARY[2], // Billing
  NAV_OPS[0],     // Ops Console
  NAV_PRIMARY[8], // Security
] as const;

// ─── Root component ───────────────────────────────────────────────────────────

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile bottom dock ─────────────────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 gap-0.5 rounded-2xl border border-border bg-card/96 p-1 shadow-pop backdrop-blur-xl md:hidden"
      >
        {DOCK_ITEMS.map((item) => (
          <DockLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-card/98 backdrop-blur-xl md:flex">
        {/* Brand strip */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft text-primary-soft-foreground">
            <ShieldAlert className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none tracking-tight">ProdMatch Admin</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{email ?? "Admin"}</p>
          </div>
        </div>

        {/* Scrollable nav body */}
        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-4">
          {/* Primary */}
          <div className="space-y-0.5">
            {NAV_PRIMARY.map((item) => (
              <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>

          {/* Ops divider */}
          <div className="mt-6 mb-2 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Focused Ops
            </p>
          </div>
          <div className="space-y-0.5">
            {NAV_OPS.map((item) => (
              <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} small />
            ))}
          </div>
        </nav>

        {/* Back-to-app footer */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground motion-reduce:transition-none"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─── Desktop sidebar link ─────────────────────────────────────────────────────

function SideLink({
  item, active, small = false,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  small?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium transition-colors motion-reduce:transition-none",
        small ? "text-xs" : "text-sm",
        active
          ? "bg-primary-soft text-primary-soft-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("shrink-0", small ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
    </Link>
  );
}

// ─── Mobile dock link ─────────────────────────────────────────────────────────

function DockLink({
  item, active,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
}) {
  const Icon = item.icon;
  // Shorten labels to fit in dock slots
  const short = item.label
    .replace("Jobs & Matches", "Jobs")
    .replace("Crawler Intel", "Crawler")
    .replace("Ops Console", "Ops")
    .replace("Operations", "Ops");
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors motion-reduce:transition-none",
        active
          ? "bg-primary-soft text-primary-soft-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-[1.125rem] w-[1.125rem]" />
      <span className="max-w-full truncate">{short}</span>
    </Link>
  );
}

// ─── Active detection ─────────────────────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
