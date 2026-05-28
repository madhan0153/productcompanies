import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";
import { Card, KPI, SectionHeader } from "@/components/admin/pm";

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
    { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL",       set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), detail: "Supabase project URL for all DB + auth operations.", critical: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service role key",  set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), detail: "Admin-level DB access. Server-only.", critical: true },
    { key: "ADMIN_EMAILS", label: "Admin email allowlist",
      set: Boolean(process.env.ADMIN_EMAILS),
      detail: process.env.ADMIN_EMAILS
        ? `${process.env.ADMIN_EMAILS.split(",").filter(Boolean).length} admin(s) configured.`
        : "Unset — all /admin/* routes return 404.",
      critical: true,
    },
    { key: "GEMINI_API_KEY", label: "Gemini API keys",
      set: geminiKeys > 0,
      detail: geminiKeys > 0 ? `${geminiKeys} key(s) loaded.` : "Unset — fallback chain only.",
    },
    { key: "LLM_FORCE_BLOCK_FREE_PROVIDERS", label: "LLM kill switch",
      set: /^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? ""),
      detail: "When ON, blocks all free providers. Emergency LLM stop.",
      inverted: true,
    },
    { key: "LLM_ENABLE_DETERMINISTIC_FALLBACKS", label: "Deterministic fallbacks",
      set: !/^(0|false|no|off)$/i.test(process.env.LLM_ENABLE_DETERMINISTIC_FALLBACKS ?? "true"),
      detail: "Ensures crawler & matching degrade gracefully when LLM is exhausted.",
    },
    { key: "RESEND_API_KEY",  label: "Resend API key", set: Boolean(process.env.RESEND_API_KEY), detail: "Required for digest emails and DPDP export delivery." },
    { key: "RESEND_FROM_EMAIL", label: "From email",   set: Boolean(process.env.RESEND_FROM_EMAIL), detail: process.env.RESEND_FROM_EMAIL ?? "Unset — email sending will fail." },
    { key: "CRON_SECRET",     label: "Cron secret",    set: Boolean(process.env.CRON_SECRET), detail: "Protects /api/cron/* endpoints." },
    { key: "CRAWL_ALERT_WEBHOOK_URL", label: "Crawler alert webhook", set: Boolean(process.env.CRAWL_ALERT_WEBHOOK_URL), detail: "Slack/Discord webhook for crawler failure alerts." },
    { key: "DPDP_POLICY_VERSION", label: "DPDP policy version", set: Boolean(process.env.DPDP_POLICY_VERSION), detail: `Current: ${process.env.DPDP_POLICY_VERSION ?? "1 (default)"}` },
    { key: "NEXT_PUBLIC_APP_URL", label: "App URL", set: Boolean(process.env.NEXT_PUBLIC_APP_URL), detail: process.env.NEXT_PUBLIC_APP_URL ?? "Unset — absolute links in emails will break." },
    { key: "DODO_PAYMENTS_API_KEY", label: "Dodo Payments API key", set: Boolean(process.env.DODO_PAYMENTS_API_KEY), detail: "Required for billing integration." },
    { key: "DODO_PAYMENTS_ENVIRONMENT", label: "Dodo environment", set: true, detail: `Mode: ${process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode (default)"}` },
  ];

  const healthy  = checks.filter((c) => (c.inverted ? !c.set : c.set)).length;
  const critical = checks.filter((c) => c.critical && !(c.inverted ? !c.set : c.set)).length;

  const bannerTone: "ok" | "warn" | "err" =
    critical > 0 ? "err" : healthy === checks.length ? "ok" : "warn";
  const bannerBg = bannerTone === "err" ? "var(--err-soft)" : bannerTone === "ok" ? "var(--ok-soft)" : "var(--warn-soft)";
  const bannerFg = bannerTone === "err" ? "var(--err)"      : bannerTone === "ok" ? "var(--ok)"      : "var(--warn)";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Settings
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Settings & Configuration
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Environment variable health, feature flags, and platform configuration.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Healthy"        value={`${healthy}/${checks.length}`} accent />
        <KPI label="Critical fail"  value={String(critical)} />
        <KPI label="Providers live" value={String(runtime.providers.length)} />
        <KPI label="LLM ops routed" value={String(runtime.operations.length)} />
      </div>

      <div style={{
        marginTop: 18, padding: 14, borderRadius: 12,
        background: bannerBg,
        border: `1px solid color-mix(in oklab, ${bannerFg} 30%, transparent)`,
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        {critical > 0
          ? <AlertTriangle size={18} style={{ color: bannerFg, flexShrink: 0, marginTop: 2 }} />
          : healthy === checks.length
            ? <ShieldCheck    size={18} style={{ color: bannerFg, flexShrink: 0, marginTop: 2 }} />
            : <AlertTriangle  size={18} style={{ color: bannerFg, flexShrink: 0, marginTop: 2 }} />}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: bannerFg }}>
            {critical > 0
              ? `${critical} critical env var${critical > 1 ? "s" : ""} missing`
              : healthy === checks.length
                ? "All environment checks pass"
                : `${checks.length - healthy} optional var${checks.length - healthy > 1 ? "s" : ""} unset`}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {healthy}/{checks.length} checks pass · {checks.filter((c) => c.critical).length} are critical
          </p>
        </div>
      </div>

      <Section title="Critical configuration" desc="Missing any of these will break core functionality.">
        <CheckGrid checks={checks.filter((c) => c.critical)} />
      </Section>

      <Section title="LLM & AI routing" desc="Provider chain and fallback configuration.">
        <CheckGrid checks={checks.filter((c) => ["GEMINI_API_KEY","LLM_FORCE_BLOCK_FREE_PROVIDERS","LLM_ENABLE_DETERMINISTIC_FALLBACKS"].includes(c.key))} />

        {runtime.providers.length > 0 && (
          <Card p={0} style={{ marginTop: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                <tr>
                  {["Provider", "Keys", "Text models", "Embedding"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 600,
                      color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runtime.providers.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < runtime.providers.length - 1 ? "1px solid var(--line-2)" : "none" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{p.label}</td>
                    <td style={{ padding: "12px 16px" }} className="pm-num">{p.keyCount}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-3)" }}>{p.textModels.slice(0, 2).join(", ")}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>{p.embeddingModel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      <Section title="Email & scheduling" desc="Resend and cron endpoint protection.">
        <CheckGrid checks={checks.filter((c) => ["RESEND_API_KEY","RESEND_FROM_EMAIL","CRON_SECRET","CRAWL_ALERT_WEBHOOK_URL"].includes(c.key))} />
      </Section>

      <Section title="Platform & compliance" desc="App URL, DPDP policy, and Dodo Payments.">
        <CheckGrid checks={checks.filter((c) => ["DPDP_POLICY_VERSION","NEXT_PUBLIC_APP_URL","DODO_PAYMENTS_API_KEY","DODO_PAYMENTS_ENVIRONMENT"].includes(c.key))} />
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <SectionHeader title={title} sub={desc} />
      {children}
    </section>
  );
}

function CheckGrid({ checks }: { checks: EnvCheck[] }) {
  return (
    <div style={{
      display: "grid", gap: 12,
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    }}>
      {checks.map((check) => {
        const pass    = check.inverted ? !check.set : check.set;
        const failTone = check.critical ? "err" : "warn";
        const bg = pass ? "var(--surface)"
                : failTone === "err" ? "var(--err-soft)"
                                     : "var(--warn-soft)";
        const border = pass ? "var(--line)"
                : failTone === "err" ? "color-mix(in oklab, var(--err) 30%, transparent)"
                                     : "color-mix(in oklab, var(--warn) 30%, transparent)";
        const iconColor = pass ? "var(--ok)" : failTone === "err" ? "var(--err)" : "var(--warn)";
        return (
          <div key={check.key} style={{
            padding: 14, borderRadius: 12,
            background: bg, border: `1px solid ${border}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <code style={{
                fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
                color: "var(--text)", wordBreak: "break-all",
              }}>{check.key}</code>
              {pass
                ? <CheckCircle2 size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 1 }} />
                : <XCircle       size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 1 }} />}
            </div>
            <p style={{ marginTop: 6, fontSize: 11, fontWeight: 600 }}>{check.label}</p>
            <p style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>{check.detail}</p>
            {check.critical && !pass && (
              <p style={{
                marginTop: 8, fontSize: 10, fontWeight: 600,
                color: "var(--err)", textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Critical — set this now
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
