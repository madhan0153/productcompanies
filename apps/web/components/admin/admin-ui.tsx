"use client";

/**
 * Shared UI primitives for every /admin/* page.
 * All components are "use client" (framer-motion, clipboard API, etc.).
 * Pure helper functions (timeAgo, dateShort, etc.) live at the bottom.
 */

import { useState, type ComponentType, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ClipboardCheck, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tone  = "blue" | "green" | "amber" | "violet" | "rose" | "muted";
export type State = "ok" | "warn" | "danger" | "muted";
export type BadgeTone = Tone | State;
export type IconType  = ComponentType<{ className?: string }>;

// ─── Color maps ───────────────────────────────────────────────────────────────

export const TONE_CLS: Record<Tone, string> = {
  blue:   "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  green:  "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  violet: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  rose:   "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  muted:  "border-border bg-secondary/60 text-muted-foreground",
};

export const STATE_CLS: Record<State, string> = {
  ok:     "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn:   "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  muted:  "border-border bg-secondary/60 text-muted-foreground",
};

function badgeCls(tone: BadgeTone): string {
  return (tone in STATE_CLS) ? STATE_CLS[tone as State] : TONE_CLS[tone as Tone];
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
      badgeCls(tone),
    )}>
      {children}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

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

// ─── Mini metric card ─────────────────────────────────────────────────────────

export function MiniMetric({
  label, value, sub, tone,
}: { label: string; value: number | string; sub?: string; tone?: State }) {
  const numCls =
    tone === "danger" ? "text-rose-500" :
    tone === "warn"   ? "text-amber-500" : "text-foreground";
  const num = typeof value === "number" ? value.toLocaleString("en-IN") : value;
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <p className={cn("text-xl font-bold tabular-nums", numCls)}>{num}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

export function MetricStrip({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cn(
      "mb-4 grid gap-2",
      cols === 2 ? "grid-cols-2" :
      cols === 3 ? "grid-cols-2 sm:grid-cols-3" :
                   "grid-cols-2 md:grid-cols-4",
    )}>
      {children}
    </div>
  );
}

// ─── Panel (section card) ─────────────────────────────────────────────────────

export function Panel({
  id, icon: Icon, title, description, action, children,
}: {
  id?: string; icon: IconType; title: string; description?: string;
  action?: ReactNode; children: ReactNode;
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

// ─── Responsive data grid ─────────────────────────────────────────────────────

export function DataGrid<T>({
  columns, rows, getKey, renderCells, renderMobile, empty,
}: {
  columns: string[];
  rows: T[];
  getKey: (row: T) => string;
  renderCells: (row: T) => ReactNode[];
  renderMobile: (row: T) => ReactNode;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyBlock text={empty} />;
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => <div key={getKey(row)}>{renderMobile(row)}</div>)}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-background/40 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-2.5 font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr key={getKey(row)} className="align-middle transition-colors hover:bg-secondary/20">
                {renderCells(row).map((cell, i) => (
                  <td key={i} className="max-w-[22rem] px-4 py-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Mobile card record ───────────────────────────────────────────────────────

export function MobileRecord({
  title, eyebrow, status, meta, action,
}: {
  title: string; eyebrow: string; status?: ReactNode;
  meta: Array<[string, string]>; action?: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-border bg-background/55 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{eyebrow}</p>
        </div>
        {status}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-1.5">
        {meta.map(([lbl, val]) => (
          <div key={lbl} className="min-w-0 rounded-md bg-secondary/40 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{lbl}</dt>
            <dd className="mt-0.5 truncate text-xs font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      {action && <div className="mt-3">{action}</div>}
    </article>
  );
}

// ─── Two-line table cell ──────────────────────────────────────────────────────

export function IdentityCell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium leading-tight">{title}</p>
      {subtitle && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyBlock({ text, icon: Icon }: { text: string; icon?: IconType }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 p-8 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/35" />}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Horizontal rule with label ───────────────────────────────────────────────

export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

export function RankList({ title, items, className }: {
  title: string; items: Array<{ label: string; count: number }>; className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section className={cn("rounded-xl border border-border bg-secondary/20 p-4", className)}>
      <p className="mb-4 text-sm font-semibold">{title}</p>
      {items.length === 0 ? <EmptyBlock text="No data yet." /> : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── SVG sparkline ────────────────────────────────────────────────────────────

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

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow, title, description, action,
}: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

// ─── Inline group (sub-section) ───────────────────────────────────────────────

export function InlineGroup({ title, icon: Icon, children }: { title: string; icon: IconType; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </section>
  );
}

// ─── CSV download button ──────────────────────────────────────────────────────

export function CsvButton({ filename, csv }: { filename: string; csv: string }) {
  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={filename}
      className="press inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus-ring"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Export CSV</span>
    </a>
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

// ─── Pure formatting helpers ──────────────────────────────────────────────────

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function dateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function resumeStateTone(state: string): State {
  if (state === "failed")  return "danger";
  if (state === "parsing") return "warn";
  if (state === "parsed")  return "ok";
  return "muted";
}

export function crawlStatusTone(status: string): State {
  if (status === "success")                      return "ok";
  if (status === "failed")                       return "danger";
  if (status === "partial" || status === "running") return "warn";
  return "muted";
}

export function jobStatusTone(failed: boolean, ok: boolean): State {
  if (failed) return "danger";
  if (!ok)    return "warn";
  return "ok";
}
