"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Zap, Rocket, Star, CreditCard, ShieldCheck, ArrowRight } from "lucide-react";
import { PLAN_LIMITS, PRICING_COPY } from "@/lib/billing/catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Interval = "monthly" | "yearly";

interface CheckoutState {
  loading: string | null;
  error: string | null;
}

// ─── Plan configs ─────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  "Upload & AI-parse your resume",
  "30 explainable matches per month",
  "5 tailored resumes per month",
  "Strengths · gaps · reasoning on every match",
  "Job tracking & application pipeline",
  "Weekly job digest email",
  "DPDP export & erasure — always free",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited matches",
  "30 tailored resumes per month",
  "Advanced signals & filters",
  "Interview study plan",
  "DSA personalisation by role",
  "Ad-free interface",
];

const SPRINT_FEATURES = [
  "Everything in Pro",
  "100 tailored resumes per month",
  "Priority LLM queue",
  "Priority match recompute",
  "Company-wise apply plan",
  "Resume re-parse credits",
  "Premium market insight exports",
];

const CREDIT_FEATURES = [
  "50 Tailor Credits — use any time",
  "Credits never expire",
  "Works on tailored resumes, re-parses, & priority recomputes",
  "No subscription required",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("monthly");
  const [state, setState] = useState<CheckoutState>({ loading: null, error: null });

  async function startCheckout(product: string) {
    setState({ loading: product, error: null });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?next=/pricing`);
          return;
        }
        setState({ loading: null, error: data.error ?? "Checkout failed. Please try again." });
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setState({ loading: null, error: "Network error. Please try again." });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="brand-mark text-base">ProdMatch</Link>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h1 className="mb-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Stop wasting 20 hours tailoring resumes
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Free builds trust. Pro is for active job-seekers who want unlimited discovery and job-specific resumes on demand.
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
                  <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Save ~16%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {state.error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/8 p-4 text-center text-sm text-rose-600 dark:text-rose-400">
            {state.error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free */}
          <PlanCard
            icon={<Star className="h-5 w-5 text-muted-foreground" />}
            name="Free"
            price="₹0"
            priceSub="forever"
            highlight={false}
            features={FREE_FEATURES}
            cta={<Link href="/auth/login" className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-secondary">Get started free</Link>}
          />

          {/* Pro */}
          <PlanCard
            icon={<Zap className="h-5 w-5 text-primary" />}
            name="Pro"
            badge="Most popular"
            price={interval === "monthly" ? PRICING_COPY.proDaily : PRICING_COPY.proYearly}
            priceSub={interval === "monthly" ? PRICING_COPY.proMonthlyBilling : "billed annually"}
            highlight={true}
            features={PRO_FEATURES}
            cta={
              <button
                onClick={() => startCheckout(interval === "monthly" ? "pro_monthly" : "pro_yearly")}
                disabled={!!state.loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {state.loading === (interval === "monthly" ? "pro_monthly" : "pro_yearly")
                  ? "Redirecting…"
                  : "Upgrade to Pro"}
              </button>
            }
          />

          {/* Career Sprint */}
          <PlanCard
            icon={<Rocket className="h-5 w-5 text-violet-500" />}
            name="Career Sprint"
            price={interval === "monthly" ? PRICING_COPY.careerSprintMonthly : PRICING_COPY.careerSprintYearly}
            priceSub={interval === "monthly" ? "per month" : "billed annually"}
            highlight={false}
            features={SPRINT_FEATURES}
            cta={
              <button
                onClick={() => startCheckout(interval === "monthly" ? "career_sprint_monthly" : "career_sprint_yearly")}
                disabled={!!state.loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                {state.loading === (interval === "monthly" ? "career_sprint_monthly" : "career_sprint_yearly")
                  ? "Redirecting…"
                  : "Start Sprint"}
              </button>
            }
          />

          {/* Credit Pack */}
          <PlanCard
            icon={<CreditCard className="h-5 w-5 text-amber-500" />}
            name="Credit Pack"
            price="₹999"
            priceSub="one-time · no subscription"
            highlight={false}
            features={CREDIT_FEATURES}
            cta={
              <button
                onClick={() => startCheckout("tailor_credits_50")}
                disabled={!!state.loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                {state.loading === "tailor_credits_50" ? "Redirecting…" : "Buy 50 credits"}
              </button>
            }
          />
        </div>

        {/* Founders / promo CTA */}
        <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-border bg-secondary/30 px-6 py-4 text-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          <span className="text-muted-foreground">
            Early supporter or Founder's Friend?{" "}
            <Link href="/early-access" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
              Redeem your access code
            </Link>
          </span>
        </div>

        {/* Feature comparison table */}
        <ComparisonTable />

        {/* FAQ */}
        <Faq />
      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlanCard({
  icon, name, badge, price, priceSub, highlight, features, cta,
}: {
  icon: React.ReactNode;
  name: string;
  badge?: string;
  price: string;
  priceSub: string;
  highlight: boolean;
  features: string[];
  cta: React.ReactNode;
}) {
  return (
    <div
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
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-semibold">{name}</span>
      </div>
      <div className="mb-1">
        <span className="font-display text-3xl font-bold">{price}</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{priceSub}</p>
      <ul className="mb-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}

function ComparisonTable() {
  const rows: { label: string; free: string; pro: string; sprint: string }[] = [
    { label: "Matches / month",        free: "30",          pro: "Unlimited",    sprint: "Unlimited" },
    { label: "Tailored resumes",       free: "5 / month",   pro: "30 / month",   sprint: "100 / month" },
    { label: "Explainable scoring",    free: "✓",           pro: "✓",            sprint: "✓" },
    { label: "Interview study plan",   free: "—",           pro: "✓",            sprint: "✓" },
    { label: "DSA personalisation",    free: "—",           pro: "✓",            sprint: "✓" },
    { label: "Advanced signals",       free: "—",           pro: "✓",            sprint: "✓" },
    { label: "Priority LLM queue",     free: "—",           pro: "—",            sprint: "✓" },
    { label: "Company apply plan",     free: "—",           pro: "—",            sprint: "✓" },
    { label: "Premium exports",        free: "—",           pro: "—",            sprint: "✓" },
    { label: "DPDP export / erasure",  free: "Always free", pro: "Always free",  sprint: "Always free" },
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
                  <td key={i} className={`px-4 py-3 text-center tabular-nums ${val === "✓" ? "text-emerald-500 font-bold" : val === "—" ? "text-muted-foreground" : "font-medium"}`}>
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
      a: "Yes. Cancel from your billing settings and you keep access until the end of the billing period.",
    },
    {
      q: "What's a Tailor Credit?",
      a: "One credit = one tailored resume, one resume re-parse, or one priority recompute. Credits from packs never expire.",
    },
    {
      q: "Do credits carry over between months?",
      a: "Monthly plan limits reset each month. Credits bought as one-time packs never expire — they're yours.",
    },
    {
      q: "Is my data safe?",
      a: "Your resume is stored in a private bucket only you can read. We comply fully with India's DPDP Act 2023. You can export or erase all your data at any time — for free.",
    },
    {
      q: "What payment methods are accepted?",
      a: "UPI, cards, net banking, and wallets via Dodo Payments. All transactions are in INR.",
    },
    {
      q: "Does Career Sprint override my lifetime Pro access?",
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
        <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
          About us
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy policy
        </Link>
      </p>
    </div>
  );
}
