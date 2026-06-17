"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Check, Zap, Rocket, Star, CreditCard, ShieldCheck, ArrowRight, ArrowLeft,
  Clock, Sparkles, X as XIcon, LayoutDashboard,
} from "lucide-react";
import { PRICING_COPY, type CheckoutProductId } from "@/lib/billing/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAvailability } from "@/lib/billing/use-availability";

type Interval = "monthly" | "yearly";

interface CheckoutState { loading: string | null; error: string | null; }

// ─── Feature lists per tier (concrete, outcome-focused) ───────────────────────

const FREE_FEATURES = [
  "20 explainable matches / 30 days",
  "5 tailored resumes / 30 days",
  "Strengths · gaps · reasoning on every match",
  "Job tracking & application pipeline",
  "Weekly job digest email",
  "DPDP export & erasure — always free",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited matches (all priority roles)",
  "30 tailored resumes / month",
  "5 resume re-parses / month",
  "Advanced signals & filters",
  "Interview study plan + DSA personalization",
  "Ad-free interface",
];

const SPRINT_FEATURES = [
  "Everything in Pro",
  "100 tailored resumes / month",
  "20 resume re-parses / month",
  "Priority LLM queue (jumps the line)",
  "Priority match recompute",
  "Company-wise apply plan",
  "Premium market-insight exports",
];

const CREDIT_FEATURES = [
  "50 Tailor Credits — never expire",
  "Use across tailored resumes, re-parses, priority recomputes",
  "No subscription, no auto-renew",
  "Stacks on top of free quota",
];

export default function PricingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("monthly");
  const [state, setState] = useState<CheckoutState>({ loading: null, error: null });
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const availability = useAvailability();
  // Once a CTA returns 503 unavailable mid-session, dim it for the rest of
  // the visit even if the cached availability probe was optimistic.
  const [unavailable, setUnavailable] = useState<Set<CheckoutProductId>>(new Set());
  const isUnavailable = (id: CheckoutProductId): boolean =>
    unavailable.has(id) || !availability.isAvailable(id);

  // Detect auth state on the client so the nav can show the right CTA.
  // null = unknown (initial paint), true = signed in, false = signed out.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setIsSignedIn(Boolean(data?.user));
    });
    return () => { cancelled = true; };
  }, []);

  async function startCheckout(product: CheckoutProductId) {
    if (isUnavailable(product)) return; // hard-stop: CTA is decorative
    setState({ loading: product, error: null });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, returnTo: "/dashboard" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/pricing`);
          return;
        }
        if (data.code === "unavailable") {
          setUnavailable((prev) => {
            const next = new Set(prev);
            next.add(product);
            return next;
          });
          setState({ loading: null, error: "That plan isn't available yet — try a different one or apply a coupon below." });
          return;
        }
        setState({ loading: null, error: data.error ?? "We couldn't start checkout. Please try again." });
        return;
      }
      if (!data.checkoutUrl) {
        setState({ loading: null, error: "This plan is temporarily unavailable. Please try again shortly or pick another plan." });
        return;
      }
      // Same-tab redirect — reliable on mobile (no popup blockers); the user
      // returns via /billing/success after payment.
      window.location.assign(data.checkoutUrl);
    } catch {
      setState({ loading: null, error: "Network error. Please check your connection and try again." });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav — auth-aware. Signed-in users get a "back to dashboard" link
          (since they already have an account). Signed-out users see Sign in. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </Link>
          ) : (
            <Link href="/" className="brand-mark text-base">ProdMatch</Link>
          )}
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Sign in
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h1 className="mb-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            Stop wasting 20 hours per job
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            Free shows you 20 great matches a month and lets you tailor 5 resumes.
            Pro removes every limit for less than the price of a chai a day.
          </p>
        </div>

        {/* Interval toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/60 p-1">
            {(["monthly", "yearly"] as Interval[]).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  interval === i
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i === "monthly" ? "Monthly" : "Yearly"}
                {i === "yearly" && (
                  <span className="ml-2 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    Save {PRICING_COPY.proYearlySavingsPct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {state.error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-center text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Plan cards — order: Sprint, Pro (highlighted), Credits, Free.
            Career Sprint first anchors the perceived value of Pro. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Career Sprint — anchor */}
          {(() => {
            const sprintProduct: CheckoutProductId = interval === "monthly" ? "career_sprint_monthly" : "career_sprint_yearly";
            const sprintUnavail = isUnavailable(sprintProduct);
            return (
              <PlanCard
                icon={<Rocket className="h-5 w-5 text-violet-500" />}
                name="Career Sprint"
                tagline="30–60 day job push"
                primary={interval === "monthly" ? PRICING_COPY.sprintPerDay : PRICING_COPY.sprintPerDayYearly}
                secondary={interval === "monthly"
                  ? `${PRICING_COPY.sprintMonthly}/month, cancel anytime`
                  : `${PRICING_COPY.sprintYearly}/year · save ${PRICING_COPY.sprintYearlySavings}`}
                anchor={interval === "yearly" ? `was ${PRICING_COPY.sprintYearlyAnchor}/yr` : undefined}
                highlight={false}
                features={SPRINT_FEATURES}
                cta={
                  <button
                    onClick={() => startCheckout(sprintProduct)}
                    disabled={!!state.loading || sprintUnavail}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300"
                  >
                    {sprintUnavail
                      ? "Coming soon"
                      : state.loading === sprintProduct
                        ? "Redirecting…"
                        : "Start Sprint"}
                  </button>
                }
              />
            );
          })()}

          {/* Pro — most popular */}
          {(() => {
            const proProduct: CheckoutProductId = interval === "monthly" ? "pro_monthly" : "pro_yearly";
            const proUnavail = isUnavailable(proProduct);
            return (
              <PlanCard
                icon={<Zap className="h-5 w-5 text-primary" />}
                name="Pro"
                badge={proUnavail ? "Coming soon" : "Most popular"}
                tagline="Active applicants"
                primary={interval === "monthly" ? PRICING_COPY.proPerDay : PRICING_COPY.proPerDayYearly}
                secondary={interval === "monthly"
                  ? `${PRICING_COPY.proMonthly}/month, cancel anytime`
                  : `${PRICING_COPY.proYearly}/year · save ${PRICING_COPY.proYearlySavings}`}
                anchor={interval === "yearly" ? `was ${PRICING_COPY.proYearlyAnchor}/yr` : undefined}
                highlight={true}
                features={PRO_FEATURES}
                cta={
                  <button
                    onClick={() => startCheckout(proProduct)}
                    disabled={!!state.loading || proUnavail}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {proUnavail
                      ? "Coming soon"
                      : state.loading === proProduct
                        ? "Redirecting…"
                        : "Upgrade to Pro"}
                  </button>
                }
              />
            );
          })()}

          {/* Credit Pack — one-time */}
          {(() => {
            const creditUnavail = isUnavailable("tailor_credits_50");
            return (
              <PlanCard
                id="credits"
                icon={<CreditCard className="h-5 w-5 text-amber-500" />}
                name="Credit Pack"
                tagline="No subscription"
                primary={PRICING_COPY.creditPerUse}
                secondary={`${PRICING_COPY.creditPack50} · one-time`}
                highlight={false}
                features={CREDIT_FEATURES}
                cta={
                  <button
                    onClick={() => startCheckout("tailor_credits_50")}
                    disabled={!!state.loading || creditUnavail}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creditUnavail
                      ? "Coming soon"
                      : state.loading === "tailor_credits_50"
                        ? "Redirecting…"
                        : "Buy 50 credits"}
                  </button>
                }
              />
            );
          })()}

          {/* Free */}
          <PlanCard
            icon={<Star className="h-5 w-5 text-muted-foreground" />}
            name="Free"
            tagline="Try before you buy"
            primary="₹0"
            secondary="forever"
            highlight={false}
            features={FREE_FEATURES}
            cta={
              <Link
                href="/auth/login"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-center text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Get started free
              </Link>
            }
          />
        </div>

        {/* Trust banner */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Trust icon={<ShieldCheck className="h-4 w-4 text-success" />} text="Cancel anytime, keep access till period ends" />
          <Trust icon={<Clock className="h-4 w-4 text-amber-500" />} text="No long-term commitment, billed monthly or yearly" />
          <Trust icon={<Sparkles className="h-4 w-4 text-primary" />} text="DPDP-compliant · UPI, cards, net banking" />
        </div>

        {/* Inline coupon redemption — dynamic, mobile-first */}
        <CouponRedemption isSignedIn={isSignedIn} />

        {/* Contrast comparison: DIY vs ProdMatch */}
        <ContrastTable />

        {/* Full feature comparison */}
        <ComparisonTable />

        {/* FAQ */}
        <Faq />
      </main>

      {/* Mobile sticky back-bar for signed-in users — they shouldn't feel
          stuck on a marketing page without a way back into the app. */}
      {isSignedIn && (
        <div className="fixed inset-x-2 bottom-2 z-40 flex items-center gap-2 rounded-2xl border border-border bg-card/96 p-2 shadow-pop backdrop-blur-xl sm:hidden">
          <Link
            href="/dashboard"
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
          <Link
            href="/settings/billing"
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <CreditCard className="h-3.5 w-3.5" />
            My billing
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CouponRedemption({ isSignedIn }: { isSignedIn: boolean | null }) {
  const router = useRouter();
  const [code, setCode]     = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    if (isSignedIn === false) {
      router.push(`/auth/login?next=/pricing`);
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const res  = await fetch("/api/billing/promo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; grantType?: string };
      if (!res.ok) {
        setResult({ ok: false, msg: data.error ?? "Could not redeem code." });
      } else {
        setResult({ ok: true, msg: data.message ?? "Code redeemed! Activating…" });
        setCode("");
        // Plan grants change the sidebar UsageChip, dashboard usage, every
        // gate in the app — a router.refresh() in-place keeps the user on
        // /pricing with stale chrome above the fold. Push them to the
        // dashboard so the new plan is the first thing they see. Credit /
        // tailor packs are local to /pricing → refresh in place is fine.
        setTimeout(() => {
          if (data.grantType === "plan" || data.grantType === "subscription") {
            router.push("/dashboard?redeemed=1");
          } else {
            router.refresh();
          }
        }, 1400);
      }
    } catch {
      setResult({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-secondary/40 to-secondary/10 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-center gap-2 sm:flex-1">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Have a coupon code?</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Redeem in one tap — applies instantly to your account.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="flex w-full gap-2 sm:w-auto">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            disabled={pending}
            spellCheck={false}
            autoComplete="off"
            maxLength={64}
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm uppercase tracking-widest placeholder:font-sans placeholder:text-xs placeholder:tracking-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 sm:w-44 sm:flex-none"
          />
          <button
            type="submit"
            disabled={pending || !code.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Redeeming…" : "Redeem"}
            {!pending && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </form>
      </div>

      {result && (
        <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
          result.ok
            ? "border-success/30 bg-success/10 text-success"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {result.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{result.msg}</span>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  id, icon, name, badge, tagline, primary, secondary, anchor, highlight, features, cta,
}: {
  id?: string;
  icon: React.ReactNode;
  name: string;
  badge?: string;
  tagline?: string;
  primary: string;
  secondary: string;
  anchor?: string;
  highlight: boolean;
  features: string[];
  cta: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`relative flex flex-col rounded-2xl border p-5 ${
        highlight
          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_8px_32px_hsl(var(--primary)/0.12)]"
          : "border-border bg-card shadow-elev1"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold">{name}</span>
        </div>
        {tagline && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {tagline}
          </span>
        )}
      </div>
      <div className="mb-1">
        {anchor && (
          <span className="mr-2 text-xs text-muted-foreground line-through">{anchor}</span>
        )}
        <span className="font-display text-3xl font-bold">{primary}</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{secondary}</p>
      <ul className="mb-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

function Trust({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function ContrastTable() {
  return (
    <div className="mt-12 rounded-2xl border border-border bg-secondary/30 p-6">
      <h2 className="mb-1 text-center font-display text-xl font-bold">Why people upgrade</h2>
      <p className="mb-5 text-center text-xs text-muted-foreground">
        Tailoring a resume manually vs. with Pro — for one job application:
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-destructive">
            Doing it yourself
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-start gap-2"><XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /><span>25-40 min reading JD & guessing keywords</span></li>
            <li className="flex items-start gap-2"><XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /><span>15 min rewriting bullets</span></li>
            <li className="flex items-start gap-2"><XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /><span>No idea if you're a fit until rejection</span></li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            ≈ <strong className="text-foreground">40 min × 20 roles = ~13 hours / month</strong>
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            With Pro
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /><span>Fit score with strengths & gaps in seconds</span></li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /><span>Tailored resume PDF in ~30 seconds</span></li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /><span>Skip mismatch roles, focus on real fits</span></li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            ≈ <strong className="text-foreground">2 min × 20 roles = ~40 min / month</strong>, all for <strong className="text-foreground">{PRICING_COPY.proPerDay}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable() {
  const rows: { label: string; free: string; pro: string; sprint: string }[] = [
    { label: "Matches / 30 days",     free: "20 (6 priority)", pro: "Unlimited",    sprint: "Unlimited" },
    { label: "Tailored resumes",      free: "5 / month",       pro: "30 / month",   sprint: "100 / month" },
    { label: "Resume re-parses",      free: "—",               pro: "5 / month",    sprint: "20 / month" },
    { label: "Explainable scoring",   free: "✓",               pro: "✓",            sprint: "✓" },
    { label: "Interview study plan",  free: "—",               pro: "✓",            sprint: "✓" },
    { label: "DSA personalization",   free: "—",               pro: "✓",            sprint: "✓" },
    { label: "Advanced signals",      free: "—",               pro: "✓",            sprint: "✓" },
    { label: "Priority LLM queue",    free: "—",               pro: "—",            sprint: "✓" },
    { label: "Company apply plan",    free: "—",               pro: "—",            sprint: "✓" },
    { label: "Premium exports",       free: "—",               pro: "—",            sprint: "✓" },
    { label: "DPDP export / erasure", free: "Always free",     pro: "Always free",  sprint: "Always free" },
  ];

  return (
    <div className="mt-12">
      <h2 className="mb-4 text-center font-display text-xl font-bold">Full comparison</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Feature</th>
              {["Free", "Pro", "Career Sprint"].map((h) => (
                <th key={h} className="px-4 py-3 text-center text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r) => (
              <tr key={r.label} className="hover:bg-secondary/20">
                <td className="px-4 py-3 text-muted-foreground">{r.label}</td>
                {[r.free, r.pro, r.sprint].map((val, i) => (
                  <td key={i} className={`px-4 py-3 text-center tabular-nums ${val === "✓" ? "font-bold text-success" : val === "—" ? "text-muted-foreground" : "font-medium"}`}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Faq() {
  const items = [
    {
      q: "Can I cancel anytime?",
      a: "Yes. Cancel from your billing settings — you keep access until the end of the billing period. No phone call, no email, just two clicks.",
    },
    {
      q: "What's a Tailor Credit?",
      a: "One credit = one tailored resume, one resume re-parse, or one priority recompute. Credits from packs never expire and stack on top of your plan.",
    },
    {
      q: "Why is Pro called ₹3/day and not ₹99/month?",
      a: "Both are true. ₹99 is the monthly billing. ₹3/day reflects what it actually costs you per day of access. Pick whichever makes sense to you.",
    },
    {
      q: "Do I need a credit card to try free?",
      a: "No. The free tier is forever free, no card required. Upgrade only if and when you need more.",
    },
    {
      q: "Is my data safe?",
      a: "Your resume is stored in a private bucket only you can read. We comply fully with India's DPDP Act 2023. Export or erase all your data at any time — free.",
    },
    {
      q: "Does Career Sprint override my lifetime Pro grant?",
      a: "Yes — while Sprint is active you get Sprint features. When Sprint ends, your lifetime Pro access automatically resumes.",
    },
  ];

  return (
    <div className="mt-12">
      <h2 className="mb-6 text-center font-display text-xl font-bold">Frequently asked</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.q} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-sm font-semibold">{item.q}</p>
            <p className="text-xs text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        More questions?{" "}
        <Link href="/about" className="underline underline-offset-2 hover:text-foreground">About us</Link>
        {" · "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy</Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
      </p>
    </div>
  );
}
