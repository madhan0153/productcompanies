"use client";

/**
 * Interactive PM primitives that need the browser (state, click handlers,
 * focus management). Re-exported from pm.tsx so callers see a single module.
 */

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Ico } from "./pm";

// ─── Button ───────────────────────────────────────────────────────────────────

export type BtnVariant = "primary" | "secondary" | "ghost" | "soft";
export type BtnSize    = "sm" | "md" | "lg";

export function Btn({
  children, variant = "secondary", size = "md", full, onClick,
  leading, trailing, danger, type = "button", disabled,
  formAction, name, value, "aria-label": ariaLabel,
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  onClick?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  danger?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  "aria-label"?: string;
}) {
  const sz: CSSProperties =
    size === "sm" ? { height: 30, padding: "0 10px", fontSize: 13, borderRadius: 8 }
    : size === "lg" ? { height: 44, padding: "0 18px", fontSize: 15, borderRadius: 10 }
                    : { height: 36, padding: "0 14px", fontSize: 14, borderRadius: 9 };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: {
      background: danger ? "var(--err)" : "var(--accent)",
      color:      danger ? "#fff"      : "var(--accent-ink)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-1), inset 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.18)",
    },
    secondary: {
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-1)",
    },
    ghost: { background: "transparent",     color: "var(--text-2)", border: "1px solid transparent" },
    soft:  { background: "var(--surface-2)", color: "var(--text)",   border: "1px solid transparent" },
  };
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      name={name}
      value={value}
      formAction={formAction}
      aria-label={ariaLabel}
      className="pm-btn"
      data-variant={variant}
      style={{
        ...sz, ...variants[variant],
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", fontWeight: 500,
        width: full ? "100%" : undefined,
        justifyContent: full ? "center" : undefined,
        letterSpacing: -0.005,
        transition: "background .12s, transform .06s, opacity .12s",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {leading}{children}{trailing}
    </button>
  );
}

// ─── Toggle (iOS style) ───────────────────────────────────────────────────────

export function Toggle({
  on, onChange, size = "md",
}: { on: boolean; onChange: (next: boolean) => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? 30 : 36;
  const h = size === "sm" ? 18 : 22;
  const d = h - 4;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: w, height: h, borderRadius: h, border: "none", padding: 0,
        background: on ? "var(--accent)" : "var(--surface-3)",
        position: "relative", cursor: "pointer", transition: "background .14s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? w - d - 2 : 2,
        width: d, height: d, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .14s",
      }}/>
    </button>
  );
}

// ─── Search field ─────────────────────────────────────────────────────────────

export function SearchField({
  placeholder = "Search…", value, onChange, name, trailing,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
      height: 38, background: "var(--surface-2)", borderRadius: 10,
      border: "1px solid transparent",
    }}>
      <span style={{ color: "var(--text-3)", display: "flex" }}>
        <Ico name="search" />
      </span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        name={name}
        style={{
          flex: 1, border: "none", background: "transparent", outline: "none",
          fontFamily: "inherit", fontSize: 14, color: "var(--text)", minWidth: 0,
        }}
      />
      {trailing}
    </div>
  );
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

export function FilterPills<T extends string>({
  options, value, onChange,
}: {
  options: ReadonlyArray<T | { value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="pm-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 0" }}>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v as T)}
            style={{
              padding: "6px 12px", borderRadius: 999,
              border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
              background: active ? "var(--accent-soft)" : "var(--surface)",
              color: active ? "var(--accent-strong)" : "var(--text-2)",
              fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
              cursor: "pointer", flexShrink: 0, transition: "all .12s",
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
// Accessible, mobile-first replacement for window.confirm() across admin
// mutations. Usage:
//   const { confirm, dialog } = useConfirm();
//   ... if (!(await confirm({ title, body, danger: true })) ) return;
//   render {dialog} once in the component tree.

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useConfirm(): {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const settle = useCallback((value: boolean) => {
    setState((s) => {
      s?.resolve(value);
      return null;
    });
  }, []);

  const dialog = state ? (
    <ConfirmDialog opts={state.opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  opts, onConfirm, onCancel,
}: { opts: ConfirmOptions; onConfirm: () => void; onCancel: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = "pm-confirm-title";

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        display: "flex", justifyContent: "center",
        background: "color-mix(in oklab, var(--text) 45%, transparent)",
        backdropFilter: "blur(2px)",
        padding: 12,
      }}
      className="pm-confirm-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, alignSelf: "var(--pm-confirm-align, flex-end)",
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-3)",
          padding: 20,
        }}
      >
        <h2 id={titleId} style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
          {opts.title}
        </h2>
        {opts.body && (
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
            {opts.body}
          </p>
        )}
        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onCancel}>{opts.cancelLabel ?? "Cancel"}</Btn>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="pm-btn"
            data-variant="primary"
            style={{
              height: 36, padding: "0 14px", fontSize: 14, borderRadius: 9,
              display: "inline-flex", alignItems: "center", gap: 6,
              background: opts.danger ? "var(--err)" : "var(--accent)",
              color: opts.danger ? "#fff" : "var(--accent-ink)",
              border: "1px solid transparent", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 500,
              boxShadow: "var(--shadow-1)",
            }}
          >
            {opts.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs (sliding pill) ──────────────────────────────────────────────────────

export function Tabs<T extends string>({
  options, value, onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div style={{
      display: "inline-flex", padding: 4, gap: 4, borderRadius: 10,
      background: "var(--surface-2)", border: "1px solid var(--line)",
    }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 12px", borderRadius: 7, border: "none",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-2)",
              fontWeight: 500, fontSize: 13, cursor: "pointer",
              boxShadow: active ? "var(--shadow-1)" : "none",
              transition: "background .14s, color .14s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
