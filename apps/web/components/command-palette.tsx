"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, User, Briefcase, Compass, BarChart3, ClipboardList,
  Search, ArrowRight, Zap, Upload, RefreshCw, X, Building2,
} from "lucide-react";

type Command = {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  href: string;
  group: string;
};

const ALL_COMMANDS: Command[] = [
  // Navigate
  { id: "dashboard",    label: "Dashboard",         icon: LayoutDashboard, href: "/dashboard",    group: "Navigate" },
  { id: "profile",      label: "My Profile",         icon: User,            href: "/profile",      group: "Navigate" },
  { id: "matches",      label: "Matches",            icon: Briefcase,       href: "/matches",      group: "Navigate" },
  { id: "coach",        label: "AI Coach",           icon: Compass,         href: "/coach",        group: "Navigate" },
  { id: "market",       label: "Market Insights",    icon: BarChart3,       href: "/insights",     group: "Navigate" },
  { id: "applications", label: "Applications",       icon: ClipboardList,   href: "/applications", group: "Navigate" },
  // Actions
  { id: "upload",       label: "Upload resume",       sub: "Go to profile",          icon: Upload,    href: "/profile",  group: "Actions" },
  { id: "compute",      label: "Compute matches",     sub: "Refresh AI rankings",    icon: RefreshCw, href: "/matches",  group: "Actions" },
  { id: "coach-prep",   label: "Get interview prep",  sub: "AI-generated prep tips", icon: Zap,       href: "/coach",    group: "Actions" },
  // Companies (18 approved)
  ...(["Google", "Microsoft", "Meta", "Amazon", "Apple", "Atlassian",
        "Nvidia", "Oracle", "Salesforce", "SAP Labs",
        "Razorpay", "PhonePe", "Zerodha", "CRED", "Groww",
        "Swiggy", "Zomato", "Flipkart"] as const).map((name) => ({
    id: `co-${name.toLowerCase().replace(/\s+/g, "-")}`,
    label: `${name} jobs`,
    sub: "Filter matches by company",
    icon: Building2,
    href: `/matches?c=${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`,
    group: "Companies",
  })),
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = query.trim()
    ? ALL_COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase()) ||
        (c.sub ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : ALL_COMMANDS;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group]!.push(c);
    return acc;
  }, {});

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const execute = useCallback(
    (cmd: Command) => {
      router.push(cmd.href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const cmd = filtered[activeIndex];
        if (cmd) execute(cmd);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex, execute, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? {} : { opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-[16vh] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-background/60"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, companies, actions…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                aria-label="Search"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden rounded-md border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[22rem] overflow-y-auto py-1.5" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-4 pb-0.5 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                      {group}
                    </div>
                    {items.map((cmd) => {
                      const globalIdx = filtered.findIndex((f) => f.id === cmd.id);
                      const isActive = globalIdx === activeIndex;
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-secondary/40"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{cmd.label}</span>
                            {cmd.sub && (
                              <span className="block truncate text-[11px] text-muted-foreground/60">{cmd.sub}</span>
                            )}
                          </span>
                          {isActive && (
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground/40">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span><kbd className="font-mono">esc</kbd> dismiss</span>
              <span className="ml-auto opacity-60">18 product companies · official jobs only</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
