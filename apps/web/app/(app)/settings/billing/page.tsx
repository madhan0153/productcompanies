import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CreditCard, Calendar, Gauge, Receipt, Sparkles, Zap, Star,
  ArrowUpRight, ShieldCheck, Gift,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserUsage, resetsInWords } from "@/lib/billing/usage";
import { PRICING_COPY, planLabel } from "@/lib/billing/catalog";
import { BillingActions } from "./client";

export const metadata: Metadata = { title: "Billing & Usage" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BillingSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/settings/billing");

  const admin = createSupabaseAdminClient();
  const [usage, subResult, invoicesResult] = await Promise.all([
    getUserUsage(user.id),
    admin
      .from("subscriptions")
      .select("id, plan, status, current_period_end, cancel_at_period_end, provider, created_at")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "on_hold", "past_due"])
      .order("created_at", { ascending: false })
      .maybeSingle(),
    admin
      .from("invoices")
      .select("id, amount, currency, status, hosted_invoice_url, receipt_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const sub      = subResult.data;
  const invoices = invoicesResult.data ?? [];
  const isPaid   = usage.plan !== "free";
  const isCancelPending = sub?.cancel_at_period_end === true;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-24 sm:px-6">
      <header className="mb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Settings · Billing
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Plan & usage
        </h1>
      </header>

      {/* ── Plan card ─────────────────────────────────────────────────────── */}
      <section
        className={`mb-5 rounded-2xl border p-5 shadow-elev1 ${
          usage.plan === "career_sprint" ? "border-violet-500/30 bg-violet-500/5"
          : usage.plan === "pro"          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              {usage.plan === "career_sprint" ? <Sparkles className="h-4 w-4 text-violet-500" />
                : usage.plan === "pro"        ? <Zap className="h-4 w-4 text-primary" />
                : <Star className="h-4 w-4 text-muted-foreground" />}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current plan
              </p>
            </div>
            <h2 className="font-display text-3xl font-bold leading-none">{planLabel(usage.plan)}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {usage.plan === "free" ? (
                <>Free — upgrade for unlimited matching, tailoring, and priority compute.</>
              ) : sub?.current_period_end ? (
                <>
                  {isCancelPending ? "Ends" : "Renews"}{" "}
                  <strong className="text-foreground">
                    {new Date(sub.current_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </strong>
                </>
              ) : usage.activeUntil ? (
                <>Active until <strong className="text-foreground">
                  {new Date(usage.activeUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </strong></>
              ) : (
                <>Lifetime access</>
              )}
            </p>
            {isCancelPending && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Cancellation scheduled — you keep access until the period ends.
              </p>
            )}
          </div>

          <BillingActions
            plan={usage.plan}
            hasSubscription={Boolean(sub?.id)}
            cancelPending={isCancelPending}
          />
        </div>
      </section>

      {/* ── Usage grid ────────────────────────────────────────────────────── */}
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Usage this 30-day window</h2>
          <p className="text-[11px] text-muted-foreground">
            Resets {usage.metrics.find((m) => m.resetsAt)?.resetsAt ? resetsInWords(usage.metrics.find((m) => m.resetsAt)!.resetsAt) : "next cycle"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {usage.metrics.map((m) => {
            const pct = m.unlimited ? 0 : Math.min(100, Math.round((m.used / Math.max(1, m.limit as number)) * 100));
            const tone = m.exhausted ? "rose" : pct >= 80 ? "amber" : "primary";
            return (
              <div key={m.key} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                  <span className="text-xs font-semibold tabular-nums">
                    {m.unlimited ? "Unlimited" : `${m.used} / ${m.limit}`}
                  </span>
                </div>
                {!m.unlimited && (
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                        tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {m.exhausted && !m.unlimited && (
                  <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">
                    Limit reached — resets {resetsInWords(m.resetsAt)}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Tailor Credits ────────────────────────────────────────────────── */}
      <section className="mb-5 rounded-xl border border-border bg-card p-5 shadow-elev1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Tailor Credits</p>
          </div>
          <Link
            href="/pricing#credits"
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
          >
            Buy more <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <CreditTile label="Tailored resume" value={usage.credits.tailored} />
          <CreditTile label="Resume re-parse"  value={usage.credits.reparse} />
          <CreditTile label="Priority recompute" value={usage.credits.recompute} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Credits are spent only when your monthly plan limit is exhausted, never expire, and stack with your subscription.
        </p>
      </section>

      {/* ── Invoices ───────────────────────────────────────────────────────── */}
      <section className="mb-5 rounded-xl border border-border bg-card p-5 shadow-elev1">
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Invoices & receipts</p>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium tabular-nums">
                    {(inv.currency ?? "INR") === "INR" ? "₹" : inv.currency}{(inv.amount / 100).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    inv.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}>
                    {inv.status}
                  </span>
                  {(inv.hosted_invoice_url ?? inv.receipt_url) && (
                    <a
                      href={(inv.hosted_invoice_url ?? inv.receipt_url)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium hover:bg-secondary/70"
                    >
                      Receipt <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Trust / DPDP footer ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
        <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Your data, your control
        </p>
        <ul className="space-y-1">
          <li>• Export or erase your data anytime — always free, DPDP-compliant.</li>
          <li>• 7-day refund on monthly subscriptions, no questions asked.</li>
          <li>• Cancel anytime — your access stays until the end of the billing period.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
          <Link href="/settings/privacy" className="underline-offset-2 hover:underline">Privacy & DPDP</Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">Terms</Link>
          <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy policy</Link>
        </div>
      </section>
    </div>
  );
}

function CreditTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
