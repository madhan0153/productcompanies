"use client";

/**
 * Client-only primitives for admin pages.
 * Anything that needs framer-motion, hooks, or the clipboard API lives here.
 * Server-safe primitives (Badge, DataGrid, …) live in admin-ui.tsx so they
 * can accept function props like renderCells without React crashing with
 * "Functions cannot be passed directly to Client Components".
 */

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardCheck, Copy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Progress bar (animated) ──────────────────────────────────────────────────

export function Progress({ value, label = "Score" }: { value: number; label?: string }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-primary" : v >= 30 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="min-w-[7rem]">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-foreground">{v}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

// ─── Panel (section card, animated entrance) ──────────────────────────────────

export function Panel({
  id, icon: Icon, title, description, action, children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-20 rounded-xl border border-border bg-card p-4 shadow-elev1 sm:p-5"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Icon className="h-[1.05rem] w-[1.05rem]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </motion.section>
  );
}

// ─── Sparkline (animated path) ────────────────────────────────────────────────

export function Sparkline({ values }: { values: number[] }) {
  const reduce = useReducedMotion();
  const clean = values.length > 1 ? values : [30, 44, 40, 55, 62, 58, 70, 72, 68, 76];
  const W = 320; const H = 72;
  const lo = Math.min(...clean, 0); const hi = Math.max(...clean, 100);
  const px = (i: number) => (i / Math.max(1, clean.length - 1)) * W;
  const py = (v: number) => H - 8 - ((v - lo) / Math.max(1, hi - lo)) * (H - 16);
  const line = clean.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full overflow-hidden rounded-lg bg-secondary/30">
      <defs>
        <linearGradient id="adminSparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#adminSparkGrad)"
        initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={{ once: true }} transition={{ duration: reduce ? 0 : 0.3 }} />
      <motion.path d={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }}
        viewport={{ once: true }} transition={{ duration: reduce ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

// ─── Copy-to-clipboard button ─────────────────────────────────────────────────

export function CopyButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  async function handle() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="press inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-ring"
    >
      {copied
        ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy ID"}
    </button>
  );
}
