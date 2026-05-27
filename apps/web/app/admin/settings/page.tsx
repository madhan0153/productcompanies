import type { Metadata } from "next";
import { Settings, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";
import { PageHeader } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Settings" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EnvCheck = {
  key: string;
  label: string;
  set: boolean;
  detail: string;
  critical?: boolean;
  inverted?: boolean;
};

export default async function AdminSettingsPage() {
  const runtime = describeLlmRuntime();
  const geminiKeys = (process.env.GEMINI_API_KEY ?? "").split(",").filter(Boolean).length;

  const checks: EnvCheck[] = [
    // Auth & database
    {
      key:      "NEXT_PUBLIC_SUPABASE_URL",
      label:    "Supabase URL",
      set:      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      detail:   "Supabase project URL for all DB + auth operations.",
      critical: true,
    },
    {
      key:      "SUPABASE_SERVICE_ROLE_KEY",
      label:    "Service role key",
      set:      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail:   "Admin-level DB access. Server-only. Never expose to browser.",
      critical: true,
    },
    // Admin access
    {
      key:      "ADMIN_EMAILS",
      label:    "Admin email allowlist",
      set:      Boolean(process.env.ADMIN_EMAILS),
      detail:   process.env.ADMIN_EMAILS
        ? `${process.env.ADMIN_EMAILS.split(",").filter(Boolean).length} admin(s) configured.`
        : "Unset — all /admin/* routes return 404.",
      critical: true,
    },
    // LLM
    {
      key:      "GEMINI_API_KEY",
      label:    "Gemini API keys",
      set:      geminiKeys > 0,
      detail:   geminiKeys > 0
        ? `${geminiKeys} key${geminiKeys > 1 ? "s" : ""} loaded — primary multimodal + embedding route.`
        : "Unset — fallback to free provider chain only.",
    },
    {
      key:      "LLM_FORCE_BLOCK_FREE_PROVIDERS",
      label:    "LLM kill switch",
      set:      /^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? ""),
      detail:   "When ON, blocks all free providers. Set to 1 for emergency LLM stop.",
      inverted: true,
    },
    {
      key:      "LLM_ENABLE_DETERMINISTIC_FALLBACKS",
      label:    "Deterministic fallbacks",
      set:      !/^(0|false|no|off)$/i.test(process.env.LLM_ENABLE_DETERMINISTIC_FALLBACKS ?? "true"),
      detail:   "Ensures crawler and matching degrade gracefully when LLM is exhausted.",
    },
    // Email
    {
      key:      "RESEND_API_KEY",
      label:    "Resend API key",
      set:      Boolean(process.env.RESEND_API_KEY),
      detail:   "Required for digest emails and DPDP export delivery.",
    },
    {
      key:      "RESEND_FROM_EMAIL",
      label:    "From email",
      set:      Boolean(process.env.RESEND_FROM_EMAIL),
      detail:   process.env.RESEND_FROM_EMAIL ?? "Unset — email sending will fail.",
    },
    // Cron / crawler
    {
      key:      "CRON_SECRET",
      label:    "Cron secret",
      set:      Boolean(process.env.CRON_SECRET),
      detail:   "Protects /api/cron/* endpoints from unauthenticated triggers.",
    },
    {
      key:      "CRAWL_ALERT_WEBHOOK_URL",
      label:    "Crawler alert webhook",
      set:      Boolean(process.env.CRAWL_ALERT_WEBHOOK_URL),
      detail:   "Slack/Discord webhook for crawler failure alerts. Optional.",
    },
    // DPDP
    {
      key:      "DPDP_POLICY_VERSION",
      label:    "DPDP policy version",
      set:      Boolean(process.env.DPDP_POLICY_VERSION),
      detail:   `Current: ${process.env.DPDP_POLICY_VERSION ?? "1 (default)"}`,
    },
    // App
    {
      key:      "NEXT_PUBLIC_APP_URL",
      label:    "App URL",
      set:      Boolean(process.env.NEXT_PUBLIC_APP_URL),
      detail:   process.env.NEXT_PUBLIC_APP_URL ?? "Unset — absolute links in emails will break.",
    },
    // Payments (Dodo)
    {
      key:      "DODO_PAYMENTS_API_KEY",
      label:    "Dodo Payments API key",
      set:      Boolean(process.env.DODO_PAYMENTS_API_KEY),
      detail:   "Required for billing integration. Currently scaffolded only.",
    },
    {
      key:      "DODO_PAYMENTS_ENVIRONMENT",
      label:    "Dodo environment",
      set:      true,
      detail:   `Mode: ${process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode (default)"}`,
    },
  ];

  const healthy   = checks.filter((c) => (c.inverted ? !c.set : c.set)).length;
  const critical  = checks.filter((c) => c.critical && !(c.inverted ? !c.set : c.set)).length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Settings"
        title="Settings & Configuration"
        description="Environment variable health, feature flags, and platform configuration."
      />

      {/* Summary banner */}
      <div className={`mb-6 flex items-start gap-4 rounded-xl border p-4 ${
        critical > 0
          ? "border-rose-500/30 bg-rose-500/8"
          : healthy === checks.length
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
      }`}>
        {critical > 0
          ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          : healthy === checks.length
            ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
        <div>
          <p className="text-sm font-semibold">
            {critical > 0
              ? `${critical} critical env var${critical > 1 ? "s" : ""} missing`
              : healthy === checks.length
                ? "All environment checks pass"
                : `${checks.length - healthy} optional var${checks.length - healthy > 1 ? "s" : ""} unset`}
          </p>
          <p className="text-xs text-muted-foreground">
            {healthy}/{checks.length} checks pass · {checks.filter((c) => c.critical).length} are critical
          </p>
        </div>
      </div>

      {/* Critical checks */}
      <Section title="Critical configuration" description="Missing any of these will break core functionality.">
        <CheckGrid checks={checks.filter((c) => c.critical)} />
      </Section>

      {/* LLM routing */}
      <Section title="LLM & AI routing" description="Provider chain and fallback configuration.">
        <CheckGrid checks={checks.filter((c) => ["GEMINI_API_KEY","LLM_FORCE_BLOCK_FREE_PROVIDERS","LLM_ENABLE_DETERMINISTIC_FALLBACKS"].includes(c.key))} />

        {/* Active provider table */}
        {runtime.providers.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background/40">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Provider", "Keys", "Text models", "Embedding"].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {runtime.providers.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{p.label}</td>
                    <td className="px-4 py-3 tabular-nums">{p.keyCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.textModels.slice(0,2).join(", ")}</td>
                    <td className="px-4 py-3 text-xs">{p.embeddingModel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Email & Cron */}
      <Section title="Email & scheduling" description="Resend and cron endpoint protection.">
        <CheckGrid checks={checks.filter((c) => ["RESEND_API_KEY","RESEND_FROM_EMAIL","CRON_SECRET","CRAWL_ALERT_WEBHOOK_URL"].includes(c.key))} />
      </Section>

      {/* Other */}
      <Section title="Platform & compliance" description="App URL, DPDP policy version, and Dodo Payments.">
        <CheckGrid checks={checks.filter((c) => ["DPDP_POLICY_VERSION","NEXT_PUBLIC_APP_URL","DODO_PAYMENTS_API_KEY","DODO_PAYMENTS_ENVIRONMENT"].includes(c.key))} />
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CheckGrid({ checks }: { checks: EnvCheck[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {checks.map((check) => {
        const pass = check.inverted ? !check.set : check.set;
        return (
          <div
            key={check.key}
            className={`rounded-xl border p-4 ${
              pass
                ? "border-border bg-card"
                : check.critical
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <code className="break-all text-xs font-medium">{check.key}</code>
              {pass
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                : <XCircle     className={`mt-0.5 h-4 w-4 shrink-0 ${check.critical ? "text-rose-500" : "text-amber-500"}`} />}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-foreground">{check.label}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{check.detail}</p>
            {check.critical && !pass && (
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-500">Critical — set this now</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
