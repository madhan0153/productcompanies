"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Briefcase,
  DatabaseZap,
  FileText,
  LayoutDashboard,
  LibraryBig,
  Radar,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin#users", label: "Users", icon: Users },
  { href: "/admin#resumes", label: "Resumes", icon: FileText },
  { href: "/admin#jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin#crawler", label: "Crawler", icon: Radar },
  { href: "/admin#llm", label: "LLM", icon: BrainCircuit },
  { href: "/admin#analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin#content", label: "Content", icon: LibraryBig },
  { href: "/admin#settings", label: "Settings", icon: Settings },
  { href: "/admin#security", label: "Security", icon: ShieldAlert },
] as const;

const OPS = [
  { href: "/admin/crawler-intel", label: "Crawler Intel", icon: DatabaseZap },
  { href: "/admin/ai-ops", label: "AI Ops", icon: BrainCircuit },
  { href: "/admin/health", label: "Operations", icon: Activity },
] as const;

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur md:hidden">
        <div className="px-4 py-3">
          <Brand email={email} />
          <nav aria-label="Admin sections" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {[...NAV, ...OPS].map((item) => (
              <MobileLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </nav>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-background/95 px-4 py-5 backdrop-blur md:block">
        <Brand email={email} />
        <nav aria-label="Admin sections" className="mt-8 space-y-1">
          {NAV.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Focused Ops</p>
          <nav aria-label="Admin operations" className="mt-2 space-y-1">
            {OPS.map((item) => (
              <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} compact />
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

function Brand({ email }: { email: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        <ShieldAlert className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">ProdMatch Admin</p>
        <p className="truncate text-[11px] text-muted-foreground">{email ?? "Admin session"}</p>
      </div>
    </div>
  );
}

function MobileLink({
  item,
  active,
}: {
  item: (typeof NAV)[number] | (typeof OPS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </Link>
  );
}

function SideLink({
  item,
  active,
  compact = false,
}: {
  item: (typeof NAV)[number] | (typeof OPS)[number];
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
      } ${compact ? "text-xs" : ""}`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  const base = href.split("#")[0] || href;
  if (href.includes("#")) return false;
  if (base === "/admin") return pathname === "/admin";
  return pathname === base || pathname.startsWith(`${base}/`);
}
