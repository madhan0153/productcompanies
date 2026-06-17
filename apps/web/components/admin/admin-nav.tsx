"use client";

/**
 * Admin nav (sidebar on md+, bottom dock on mobile).
 *
 * Rebuilt against pm-tokens.css so the sidebar carries the same cream-bg /
 * oklch-violet aesthetic as the rest of the admin. All colours come from
 * var(--*) — no Tailwind palette classes here so the theme stays single-
 * sourced.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, BarChart3, BrainCircuit, Briefcase, ChevronLeft, ChevronRight,
  CreditCard, DatabaseZap, FileText, LayoutDashboard, LibraryBig,
  MoreHorizontal, Settings, ShieldAlert, Terminal, Users, X, type LucideIcon,
} from "lucide-react";
import { PMMark } from "./pm";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const NAV_PRIMARY = [
  { href: "/admin",           label: "Overview",       icon: LayoutDashboard },
  { href: "/admin/users",     label: "Users",          icon: Users },
  { href: "/admin/billing",   label: "Billing",        icon: CreditCard },
  { href: "/admin/resumes",   label: "Resumes",        icon: FileText },
  { href: "/admin/jobs",      label: "Jobs & Matches", icon: Briefcase },
  { href: "/admin/analytics", label: "Analytics",      icon: BarChart3 },
  { href: "/admin/content",   label: "Content",        icon: LibraryBig },
  { href: "/admin/settings",  label: "Settings",       icon: Settings },
  { href: "/admin/security",  label: "Security",       icon: ShieldAlert },
] as const;

const NAV_OPS = [
  { href: "/admin/ops",           label: "Ops Console",   icon: Terminal },
  { href: "/admin/crawler-intel", label: "Crawler Intel", icon: DatabaseZap },
  { href: "/admin/ai-ops",        label: "AI Ops",        icon: BrainCircuit },
  { href: "/admin/health",        label: "Health",        icon: Activity },
] as const;

// Four one-tap quick links on mobile; the 5th slot opens a sheet with every
// remaining section so a mobile operator can reach all 13 (not just these 4).
const DOCK_ITEMS = [
  NAV_PRIMARY[0], NAV_PRIMARY[1], NAV_PRIMARY[2], NAV_OPS[0],
] as const;

type NavItem = { href: string; label: string; icon: LucideIcon };

// ─── Root ─────────────────────────────────────────────────────────────────────

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes (i.e. a link was tapped).
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile bottom dock */}
      <nav
        aria-label="Admin navigation"
        style={{
          position: "fixed", left: 8, right: 8, bottom: 8, zIndex: 40,
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2,
          padding: 4, borderRadius: 16,
          background: "color-mix(in oklab, var(--surface) 96%, transparent)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-2)",
          backdropFilter: "blur(14px)",
        }}
        className="md:hidden"
      >
        {DOCK_ITEMS.map((item) => (
          <DockLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <DockButton
          label="More"
          icon={MoreHorizontal}
          active={moreOpen || !DOCK_ITEMS.some((d) => isActive(pathname, d.href))}
          onClick={() => setMoreOpen(true)}
        />
      </nav>

      {moreOpen && (
        <MoreSheet pathname={pathname} email={email} onClose={() => setMoreOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          position: "fixed", inset: "0 auto 0 0", zIndex: 30, width: 288,
          flexDirection: "column",
          borderRight: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        {/* Brand strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "18px 20px",
          borderBottom: "1px solid var(--line)",
        }}>
          <span style={{ color: "var(--accent)", display: "flex" }}>
            <PMMark size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: -0.1 }}>
              ProdMatch <span style={{ color: "var(--text-3)", fontWeight: 500 }}>admin</span>
            </p>
            <p style={{
              marginTop: 2, fontSize: 11, color: "var(--text-3)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {email ?? "Admin"}
            </p>
          </div>
        </div>

        {/* Scrollable nav body */}
        <nav aria-label="Admin sections" style={{ flex: 1, overflowY: "auto", padding: "14px 10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_PRIMARY.map((item) => (
              <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>

          <div style={{ marginTop: 22, marginBottom: 8, padding: "0 12px" }}>
            <p style={{
              fontSize: 10, fontWeight: 600, color: "var(--text-3)",
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              Focused Ops
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_OPS.map((item) => (
              <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} small />
            ))}
          </div>
        </nav>

        {/* Back-to-app footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}>
          <Link
            href="/"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 9,
              fontSize: 12, color: "var(--text-3)",
              transition: "background .12s, color .12s",
            }}
            className="pm-nav-link"
            data-active="false"
          >
            <ChevronLeft size={14} />
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SideLink({
  item, active, small = false,
}: { item: NavItem; active: boolean; small?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: small ? "7px 12px" : "9px 12px",
        borderRadius: 9,
        fontSize: small ? 12 : 13, fontWeight: 500,
        background:
          active ? "var(--accent-soft)" : "transparent",
        color:
          active ? "var(--accent-strong)" : "var(--text-2)",
        transition: "background .12s, color .12s",
      }}
      className="pm-nav-link"
      data-active={active ? "true" : "false"}
    >
      <Icon
        size={small ? 14 : 16}
        className="shrink-0"
        style={{ color: active ? "var(--accent)" : "var(--text-3)" }}
      />
      <span style={{
        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{item.label}</span>
      {active && (
        <ChevronRight size={14} style={{ color: "var(--accent)", opacity: 0.6 }} />
      )}
    </Link>
  );
}

// ─── Mobile dock link ─────────────────────────────────────────────────────────

function DockLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const short = item.label
    .replace("Jobs & Matches", "Jobs")
    .replace("Crawler Intel",  "Crawler")
    .replace("Ops Console",    "Ops");
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 52, gap: 2, padding: "0 4px",
        borderRadius: 12,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-strong)" : "var(--text-2)",
        fontSize: 10, fontWeight: 500,
        transition: "background .12s, color .12s",
      }}
    >
      <Icon size={18} style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
      <span style={{
        maxWidth: "100%", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{short}</span>
    </Link>
  );
}

// ─── Mobile dock button (non-link, opens the More sheet) ──────────────────────

function DockButton({
  label, icon: Icon, active, onClick,
}: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 52, gap: 2, padding: "0 4px",
        border: "none", cursor: "pointer", fontFamily: "inherit",
        borderRadius: 12,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-strong)" : "var(--text-2)",
        fontSize: 10, fontWeight: 500,
      }}
    >
      <Icon size={18} style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
      <span>{label}</span>
    </button>
  );
}

// ─── Mobile "More" sheet — every section, reachable on phones ──────────────────

function MoreSheet({
  pathname, email, onClose,
}: { pathname: string; email: string | null; onClose: () => void }) {
  // Escape to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All admin sections"
      onClick={onClose}
      className="md:hidden"
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "flex-end",
        background: "color-mix(in oklab, var(--text) 45%, transparent)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxHeight: "80vh", overflowY: "auto",
          background: "var(--surface)",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          border: "1px solid var(--line)",
          padding: "8px 12px calc(16px + env(safe-area-inset-bottom))",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 4px 12px",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            All sections {email ? <span style={{ color: "var(--text-3)", fontWeight: 500 }}>· {email}</span> : null}
          </p>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 999, border: "none",
              background: "var(--surface-2)", color: "var(--text-2)", cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[...NAV_PRIMARY, ...NAV_OPS].map((item) => (
            <SheetLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>

        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 10,
            padding: "10px 12px", borderRadius: 10,
            fontSize: 13, color: "var(--text-3)",
            border: "1px solid var(--line)",
          }}
        >
          <ChevronLeft size={14} /> Back to app
        </Link>
      </div>
    </div>
  );
}

function SheetLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        minHeight: 48, padding: "0 12px", borderRadius: 12,
        fontSize: 13, fontWeight: 500,
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
        color: active ? "var(--accent-strong)" : "var(--text-2)",
      }}
    >
      <Icon size={16} style={{ color: active ? "var(--accent)" : "var(--text-3)" }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.label}
      </span>
    </Link>
  );
}

// ─── Active detection ────────────────────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
