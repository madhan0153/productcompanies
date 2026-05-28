"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  AlertCircle, CheckCircle2, ChevronDown, Copy, Loader2, Pause, Plus, Search, X,
} from "lucide-react";
import {
  createPromoCode, deactivatePromoCode, type PromoFormState,
} from "@/lib/admin/actions/promos";
import type { CouponRow } from "./page";

type Filter = "all" | "active" | "expiring" | "paused" | "expired";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Search + create CTA */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          flex: 1, minWidth: 200,
          display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          height: 38, background: "var(--surface-2)", borderRadius: 10,
          border: "1px solid transparent",
        }}>
          <Search size={14} style={{ color: "var(--text-3)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by label or grant type…"
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontFamily: "inherit", fontSize: 14, color: "var(--text)", minWidth: 0,
            }}
          />
        </div>
        <button type="button" onClick={() => setCreating((v) => !v)} className="pm-cta">
          {creating ? <X size={14} /> : <Plus size={14} />}
          {creating ? "Close" : "New coupon"}
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }} className="pm-scroll">
        {(["all", "active", "expiring", "paused", "expired"] as Filter[]).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 12px", borderRadius: 999,
                border: isActive ? "1px solid var(--accent)" : "1px solid var(--line)",
                background: isActive ? "var(--accent-soft)" : "var(--surface)",
                color: isActive ? "var(--accent-strong)" : "var(--text-2)",
                fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", textTransform: "capitalize",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {creating && <NewCouponSheet onDone={() => setCreating(false)} />}

      <div style={{
        borderRadius: 14, border: "1px solid var(--line)",
        background: "var(--surface)", overflow: "hidden",
        boxShadow: "var(--shadow-1)",
      }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            {query || filter !== "all"
              ? "No coupons match the current filter."
              : "No coupons yet. Tap “New coupon” to create one."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filtered.map((c, i) => (
              <CouponRowItem
                key={c.id}
                coupon={c}
                expanded={expanded === c.id}
                onToggle={() => setExpanded((curr) => curr === c.id ? null : c.id)}
                divider={i < filtered.length - 1}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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
    <div style={{
      padding: 18, borderRadius: 14,
      background: "var(--accent-soft)",
      border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
    }}>
      <p style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>Create a new coupon</p>
      <form action={action} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Internal label">
          <input type="text" name="label" required maxLength={64} placeholder="e.g. Founders Q1" className="pm-input" />
        </Field>
        <Field label="Code prefix (optional)">
          <input type="text" name="prefix" defaultValue="FRIEND" maxLength={8} className="pm-input" />
        </Field>

        <Field label="Grant type" span={2}>
          <select name="grantType" value={grantType} onChange={(e) => setGrantType(e.target.value)} className="pm-select">
            <option value="pro_12_months">Pro — 12 months</option>
            <option value="pro_lifetime">Pro — Lifetime</option>
            <option value="career_sprint_3_months">Career Sprint — 3 months</option>
            <option value="credits_fixed">Credits — fixed amount</option>
          </select>
        </Field>

        {grantType === "credits_fixed" && (
          <>
            <Field label="Credit kind">
              <select name="creditKind" defaultValue="tailored_resume" className="pm-select">
                <option value="tailored_resume">Tailored resume</option>
                <option value="resume_reparse">Resume re-parse</option>
                <option value="priority_recompute">Priority recompute</option>
              </select>
            </Field>
            <Field label="Credit amount">
              <input type="number" name="creditAmount" min={1} max={1000} defaultValue={10} className="pm-input pm-num" />
            </Field>
          </>
        )}

        <Field label="Custom duration (days)">
          <input type="number" name="durationDays" min={1} max={3650} placeholder="auto" className="pm-input pm-num" />
        </Field>
        <Field label="Max redemptions">
          <input type="number" name="maxRedemptions" min={1} placeholder="unlimited" className="pm-input pm-num" />
        </Field>
        <Field label="Code expires (days from now)" span={2}>
          <input type="number" name="expiresInDays" min={1} max={3650} placeholder="never" className="pm-input pm-num" />
        </Field>

        <div style={{ gridColumn: "span 2", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" onClick={onDone} className="pm-cta pm-cta-secondary">Cancel</button>
          <button type="submit" disabled={pending} className="pm-cta">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {pending ? "Creating…" : "Create coupon"}
          </button>
        </div>
      </form>

      {state.message && !state.ok && (
        <div className="pm-alert" data-tone="err" style={{ marginTop: 12 }}>
          <AlertCircle size={14} /> <span>{state.message}</span>
        </div>
      )}

      {state.ok && state.code && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 12,
          background: "var(--ok-soft)",
          border: "2px dashed color-mix(in oklab, var(--ok) 40%, transparent)",
        }}>
          <p style={{ marginBottom: 8, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ok)" }}>
            ⚠ Copy now — this code is shown only once
          </p>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 8,
            background: "var(--surface)",
          }}>
            <code style={{
              flex: 1, fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700,
              letterSpacing: "0.06em", color: "var(--text)", wordBreak: "break-all",
            }}>{state.code}</code>
            <button
              type="button"
              onClick={copy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 6,
                background: "var(--surface-2)", color: "var(--text)",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >
              {copied ? <CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>{state.message}</p>
        </div>
      )}
    </div>
  );
}

function CouponRowItem({
  coupon, expanded, onToggle, divider,
}: {
  coupon: CouponRow;
  expanded: boolean;
  onToggle: () => void;
  divider: boolean;
}) {
  const [pending, start] = useTransition();
  const status = statusOf(coupon);
  const pct = coupon.max_redemptions
    ? Math.min(100, Math.round((coupon.redeemed_count / coupon.max_redemptions) * 100))
    : 0;

  const stateBg = status === "active"   ? "var(--ok-soft)"
                : status === "expiring" ? "var(--warn-soft)"
                                        : "var(--surface-2)";
  const stateFg = status === "active"   ? "var(--ok)"
                : status === "expiring" ? "var(--warn)"
                                        : "var(--text-3)";

  return (
    <li style={{
      background: expanded ? "var(--surface-2)" : "transparent",
      borderBottom: divider ? "1px solid var(--line-2)" : "none",
      transition: "background .12s",
    }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", textAlign: "left",
          background: "transparent", border: "none", cursor: "pointer", color: "inherit",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {coupon.code_label ?? "Untitled"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            {coupon.grant_type.replace(/_/g, " ")}
            {coupon.duration_days && ` · ${coupon.duration_days}d`}
            {" · "}
            {coupon.redeemed_count}/{coupon.max_redemptions ?? "∞"} used
          </p>
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: 999,
          fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
          background: stateBg, color: stateFg,
        }}>{status}</span>
        <ChevronDown
          size={16}
          style={{ color: "var(--text-3)", transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform .15s" }}
        />
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 14px" }}>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 8, fontSize: 12 }}>
            <Detail label="Grant type"      value={coupon.grant_type} mono />
            {coupon.credit_kind && <Detail label="Credit kind" value={`${coupon.credit_amount} × ${coupon.credit_kind}`} />}
            <Detail label="Duration"        value={coupon.duration_days ? `${coupon.duration_days}d` : "default"} />
            <Detail label="Max redemptions" value={coupon.max_redemptions === null ? "Unlimited" : String(coupon.max_redemptions)} />
            <Detail label="Expires"         value={coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("en-IN") : "Never"} />
            <Detail label="Created"         value={new Date(coupon.created_at).toLocaleDateString("en-IN")} />
          </dl>

          {coupon.max_redemptions !== null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
                <span>Redemption progress</span>
                <span className="pm-num">{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 999, width: `${pct}%`,
                  background: "var(--accent)", transition: "width .3s",
                }}/>
              </div>
            </div>
          )}

          {status !== "expired" && status !== "exhausted" && coupon.is_active && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Pause "${coupon.code_label ?? "this code"}"? Existing redemptions stay valid; new ones will be rejected.`)) return;
                  start(() => { deactivatePromoCode(coupon.id); });
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: "var(--surface)", color: "var(--text-2)",
                  border: "1px solid var(--line)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.5 : 1,
                }}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                Pause coupon
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: 2 }) {
  return (
    <label style={{ display: "block", gridColumn: span === 2 ? "span 2" : undefined }}>
      <span className="pm-label">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</dt>
      <dd style={{
        fontSize: mono ? 11 : 12, color: "var(--text)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
      }}>{value}</dd>
    </div>
  );
}
