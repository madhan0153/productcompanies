"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  Search, Plus, ChevronDown, Copy, CheckCircle2, AlertCircle,
  X, Loader2, Pause, Play, Trash2,
} from "lucide-react";
import {
  createPromoCode, deactivatePromoCode, type PromoFormState,
} from "@/lib/admin/actions/promos";
import type { CouponRow } from "./page";

type Filter = "all" | "active" | "expiring" | "paused" | "expired";

const INPUT = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const initialState: PromoFormState = { ok: false, message: "" };

function statusOf(c: CouponRow): "active" | "expiring" | "paused" | "expired" | "exhausted" {
  if (!c.is_active) return "paused";
  const now = Date.now();
  if (c.expires_at) {
    const t = new Date(c.expires_at).getTime();
    if (t < now) return "expired";
    if (t < now + 7 * 86_400_000) return "expiring";
  }
  if (c.max_redemptions !== null && c.redeemed_count >= c.max_redemptions) return "exhausted";
  return "active";
}

export function CouponsClient({ coupons }: { coupons: CouponRow[] }) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery]       = useState("");
  const [filter, setFilter]     = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coupons.filter((c) => {
      if (q && !(c.code_label ?? "").toLowerCase().includes(q) && !c.grant_type.toLowerCase().includes(q)) return false;
      if (filter === "all") return true;
      const s = statusOf(c);
      if (filter === "active")   return s === "active";
      if (filter === "expiring") return s === "expiring";
      if (filter === "paused")   return s === "paused";
      if (filter === "expired")  return s === "expired" || s === "exhausted";
      return true;
    });
  }, [coupons, query, filter]);

  return (
    <div className="space-y-4">
      {/* Search + filter pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by label or grant type…"
            className={`${INPUT} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {creating ? "Close" : "New coupon"}
        </button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["all", "active", "expiring", "paused", "expired"] as Filter[]).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* New coupon inline sheet */}
      {creating && <NewCouponSheet onDone={() => setCreating(false)} />}

      {/* Coupon list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {query || filter !== "all"
              ? "No coupons match the current filter."
              : "No coupons yet. Tap “New coupon” to create one."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((c) => (
              <CouponRowItem
                key={c.id}
                coupon={c}
                expanded={expanded === c.id}
                onToggle={() => setExpanded((curr) => curr === c.id ? null : c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── New-coupon sheet ─────────────────────────────────────────────────────────

function NewCouponSheet({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createPromoCode, initialState);
  const [grantType, setGrantType] = useState("pro_12_months");
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <p className="mb-3 text-sm font-semibold">Create a new coupon</p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="Internal label">
          <input type="text" name="label" required maxLength={64} placeholder="e.g. Founders Q1" className={INPUT} />
        </Field>
        <Field label="Code prefix (optional)">
          <input type="text" name="prefix" defaultValue="FRIEND" maxLength={8} className={INPUT} />
        </Field>

        <Field label="Grant type" className="sm:col-span-2">
          <select name="grantType" value={grantType} onChange={(e) => setGrantType(e.target.value)} className={INPUT}>
            <option value="pro_12_months">Pro — 12 months</option>
            <option value="pro_lifetime">Pro — Lifetime</option>
            <option value="career_sprint_3_months">Career Sprint — 3 months</option>
            <option value="credits_fixed">Credits — fixed amount</option>
          </select>
        </Field>

        {grantType === "credits_fixed" && (
          <>
            <Field label="Credit kind">
              <select name="creditKind" defaultValue="tailored_resume" className={INPUT}>
                <option value="tailored_resume">Tailored resume</option>
                <option value="resume_reparse">Resume re-parse</option>
                <option value="priority_recompute">Priority recompute</option>
              </select>
            </Field>
            <Field label="Credit amount">
              <input type="number" name="creditAmount" min={1} max={1000} defaultValue={10} className={`${INPUT} tabular-nums`} />
            </Field>
          </>
        )}

        <Field label="Custom duration (days)">
          <input type="number" name="durationDays" min={1} max={3650} placeholder="auto" className={`${INPUT} tabular-nums`} />
        </Field>
        <Field label="Max redemptions">
          <input type="number" name="maxRedemptions" min={1} placeholder="unlimited" className={`${INPUT} tabular-nums`} />
        </Field>
        <Field label="Code expires (days from now)" className="sm:col-span-2">
          <input type="number" name="expiresInDays" min={1} max={3650} placeholder="never" className={`${INPUT} tabular-nums`} />
        </Field>

        <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {pending ? "Creating…" : "Create coupon"}
          </button>
        </div>
      </form>

      {state.message && !state.ok && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.message}</span>
        </div>
      )}

      {state.ok && state.code && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            ⚠️ Copy now — this code is shown only once
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-background p-3">
            <code className="flex-1 break-all font-mono text-base font-bold tracking-widest">{state.code}</code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{state.message}</p>
        </div>
      )}
    </div>
  );
}

// ─── Row item ────────────────────────────────────────────────────────────────

function CouponRowItem({
  coupon, expanded, onToggle,
}: {
  coupon:   CouponRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [pending, start] = useTransition();
  const status = statusOf(coupon);
  const pct = coupon.max_redemptions
    ? Math.min(100, Math.round((coupon.redeemed_count / coupon.max_redemptions) * 100))
    : 0;

  const stateTone = {
    active:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    expiring:  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    paused:    "border-border bg-secondary text-muted-foreground",
    expired:   "border-border bg-secondary text-muted-foreground",
    exhausted: "border-border bg-secondary text-muted-foreground",
  }[status];

  return (
    <li className={`transition-colors ${expanded ? "bg-secondary/30" : "hover:bg-secondary/20"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{coupon.code_label ?? "Untitled"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {coupon.grant_type.replace(/_/g, " ")}
            {coupon.duration_days && ` · ${coupon.duration_days}d`}
            {" · "}
            {coupon.redeemed_count}/{coupon.max_redemptions ?? "∞"} used
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${stateTone}`}>
          {status}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-4 py-3 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <Detail label="Grant type"    value={coupon.grant_type} mono />
            {coupon.credit_kind && <Detail label="Credit kind" value={`${coupon.credit_amount} × ${coupon.credit_kind}`} />}
            <Detail label="Duration"      value={coupon.duration_days ? `${coupon.duration_days}d` : "default"} />
            <Detail label="Max redemptions" value={coupon.max_redemptions === null ? "Unlimited" : String(coupon.max_redemptions)} />
            <Detail label="Expires"       value={coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("en-IN") : "Never"} />
            <Detail label="Created"       value={new Date(coupon.created_at).toLocaleDateString("en-IN")} />
          </dl>

          {coupon.max_redemptions !== null && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Redemption progress</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {status !== "expired" && status !== "exhausted" && coupon.is_active && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Pause "${coupon.code_label ?? "this code"}"? Existing redemptions stay valid; new ones will be rejected.`)) return;
                  start(() => { deactivatePromoCode(coupon.id); });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                Pause coupon
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}
