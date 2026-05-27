/**
 * ProdMatch admin component library — server-safe primitives.
 * Ported from design_handoff_prodmatch_admin/src-design/ui.jsx.
 *
 * Everything here renders fine in an RSC. Anything that needs useState /
 * onClick / framer lives in pm-client.tsx and is re-exported below.
 *
 * All visuals are token-driven: change pm-tokens.css and the whole admin
 * follows. Do not add tailwind colours here — only var(--*) and structural
 * utilities so the theme stays single-sourced.
 */

import type { CSSProperties, ReactNode } from "react";

export { Btn, Toggle, SearchField, FilterPills, Tabs } from "./pm-client";

// ─── Tone tables ──────────────────────────────────────────────────────────────

export type Tone = "neutral" | "ok" | "warn" | "err" | "info" | "accent";
export type SevTone = "info" | "warn" | "error" | "ok";

const TONE_BG: Record<Tone, string> = {
  neutral: "var(--surface-2)",
  ok:      "var(--ok-soft)",
  warn:    "var(--warn-soft)",
  err:     "var(--err-soft)",
  info:    "var(--info-soft)",
  accent:  "var(--accent-soft)",
};
const TONE_FG: Record<Tone, string> = {
  neutral: "var(--text-2)",
  ok:      "var(--ok)",
  warn:    "var(--warn)",
  err:     "var(--err)",
  info:    "var(--accent)",
  accent:  "var(--accent-strong)",
};

// ─── Brand mark ───────────────────────────────────────────────────────────────

export function PMMark({ size = 22, ink }: { size?: number; ink?: string }) {
  const c = ink ?? "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2"  y="2"  width="18" height="18" rx="4.5" fill={c} opacity="0.22"/>
      <rect x="12" y="12" width="18" height="18" rx="4.5" fill={c}/>
      <rect x="12" y="12" width="8"  height="8"  rx="1.5" fill="var(--bg)"/>
    </svg>
  );
}

export function PMLogo({ size = 22, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
      <PMMark size={size} />
      {!compact && (
        <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: -0.2, color: "var(--text)" }}>
          ProdMatch <span style={{ color: "var(--text-3)", fontWeight: 500 }}>admin</span>
        </span>
      )}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({
  children, tone = "neutral", size = "md",
}: { children: ReactNode; tone?: Tone; size?: "sm" | "md" }) {
  const sz: CSSProperties = size === "sm"
    ? { padding: "1px 6px", fontSize: 11, height: 18 }
    : { padding: "2px 8px", fontSize: 12, height: 20 };
  return (
    <span style={{
      ...sz, display: "inline-flex", alignItems: "center", gap: 4,
      background: TONE_BG[tone], color: TONE_FG[tone], borderRadius: 999,
      fontWeight: 500, lineHeight: 1, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

export function StatusDot({
  tone = "ok", live = false,
}: { tone?: "ok" | "warn" | "err" | "neutral" | "accent"; live?: boolean }) {
  const map: Record<string, string> = {
    ok:      "var(--ok)",
    warn:    "var(--warn)",
    err:     "var(--err)",
    neutral: "var(--text-3)",
    accent:  "var(--accent)",
  };
  return (
    <span
      className={live ? "pm-live-dot" : undefined}
      style={{
        display: "inline-block", width: 7, height: 7, borderRadius: "50%",
        background: map[tone],
      }}
    />
  );
}

// ─── Sev dot (with glow ring) ─────────────────────────────────────────────────

export function SevDot({ sev }: { sev: SevTone }) {
  const map: Record<SevTone, string> = {
    info:  "var(--accent)",
    warn:  "var(--warn)",
    error: "var(--err)",
    ok:    "var(--ok)",
  };
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: map[sev], flexShrink: 0,
      boxShadow: `0 0 0 3px color-mix(in oklab, ${map[sev]} 18%, transparent)`,
    }}/>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  name, tone = 268, size = 36,
}: { name: string; tone?: number; size?: number }) {
  const initials = (name || "?").split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.4,
      background: `oklch(0.92 0.05 ${tone})`,
      color:      `oklch(0.32 0.16 ${tone})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: size * 0.38, flexShrink: 0, letterSpacing: -0.2,
    }}>{initials}</div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children, p = 16, style,
}: { children: ReactNode; p?: number; style?: CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--radius-lg)", padding: p, boxShadow: "var(--shadow-1)",
      ...style,
    }}>{children}</div>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

export function KPI({
  label, value, delta, hint, accent, big, sparkData, live,
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  accent?: boolean;
  big?: boolean;
  sparkData?: number[];
  live?: boolean;
}) {
  const positive = (delta || "").trim().startsWith("+");
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--radius-lg)", padding: big ? 18 : 14,
      boxShadow: "var(--shadow-1)", position: "relative", overflow: "hidden",
    }}>
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 50%, transparent))",
        }}/>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 18 }}>
        <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
        {live && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)" }}>
            <StatusDot live /> live
          </span>
        )}
      </div>
      <div className="pm-num" style={{
        fontSize: big ? 30 : 24, fontWeight: 600, marginTop: 6,
        letterSpacing: -0.8, lineHeight: 1.1, color: "var(--text)",
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {delta && (
          <span className="pm-num" style={{
            fontSize: 12, fontWeight: 500,
            color: positive ? "var(--ok)" : "var(--err)",
          }}>{delta}</span>
        )}
        {hint && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{hint}</span>}
      </div>
      {sparkData && <Spark data={sparkData} h={32} style={{ marginTop: 8 }} />}
    </div>
  );
}

// ─── Spark ────────────────────────────────────────────────────────────────────

export function Spark({
  data, w = 200, h = 40, style,
}: { data: number[]; w?: number; h?: number; style?: CSSProperties }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const sx = (i: number) => (i / Math.max(1, data.length - 1)) * w;
  const sy = (v: number) => h - 2 - ((v - min) / Math.max(0.0001, max - min)) * (h - 4);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="pm-spark"
      style={{ display: "block", height: h, ...style }}
    >
      <path className="area" d={area} />
      <path d={path} />
    </svg>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "20px 0 10px" }}>
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

export function ListRow({
  leading, title, subtitle, meta, trailing, divider = true, dense = false, href,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  divider?: boolean;
  dense?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="pm-listrow" data-clickable={href ? "true" : "false"} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: dense ? "10px 14px" : "14px 16px",
      borderBottom: divider ? "1px solid var(--line-2)" : "none",
      cursor: href ? "pointer" : "default",
      background: "transparent",
      transition: "background .12s",
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 14, fontWeight: 500, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</span>
          {meta}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 12, color: "var(--text-3)", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{subtitle}</div>
        )}
      </div>
      {trailing}
      {href && <span style={{ color: "var(--text-3)" }}><Ico name="chev" /></span>}
    </div>
  );

  if (href) {
    // Use plain <a> so it works in RSC; nav transitions handled by app.
    return <a href={href}>{inner}</a>;
  }
  return inner;
}

// ─── Icon set ─────────────────────────────────────────────────────────────────
// Same set as ui.jsx — small, currentColor, 1.4–1.6 stroke.

export type IcoName =
  | "search" | "menu" | "bell" | "chev" | "chevD" | "close" | "plus"
  | "filter" | "dot" | "refresh" | "download" | "ext" | "check";

export function Ico({ name, size }: { name: IcoName; size?: number }) {
  const s = size ?? (name === "ext" || name === "check" ? 12 : name === "menu" || name === "bell" ? 18 : 14);
  const common = { width: s, height: s, fill: "none" as const };
  switch (name) {
    case "search":  return <svg {...common} viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
    case "menu":    return <svg {...common} viewBox="0 0 18 18"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "bell":    return <svg {...common} viewBox="0 0 18 18"><path d="M4 13V8.5A5 5 0 0114 8.5V13l1 1H3l1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
    case "chev":    return <svg {...common} viewBox="0 0 14 14"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "chevD":   return <svg {...common} viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "close":   return <svg {...common} viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "plus":    return <svg {...common} viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "filter":  return <svg {...common} viewBox="0 0 14 14"><path d="M2 3h10M4 7h6M6 11h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "dot":     return <svg {...common} viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.4"/><circle cx="7" cy="7" r="1.4"/><circle cx="11" cy="7" r="1.4"/></svg>;
    case "refresh": return <svg {...common} viewBox="0 0 14 14"><path d="M12 6A5 5 0 002 7M2 8a5 5 0 0010-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 1v3h-3M3 13v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "download":return <svg {...common} viewBox="0 0 14 14"><path d="M7 2v8m0 0l-3-3m3 3l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "ext":     return <svg {...common} viewBox="0 0 12 12"><path d="M5 2H2v8h8V7M7 2h3v3M10 2L5.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "check":   return <svg {...common} viewBox="0 0 12 12"><path d="M2 6.5L5 9.5l5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
}
