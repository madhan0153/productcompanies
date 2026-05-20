import type { Metadata } from "next";
import { AlertTriangle, BrainCircuit, Database, FileText, Lock, Route } from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";

export const metadata: Metadata = { title: "Admin · AI Ops" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAiOpsPage() {
  const runtime = describeLlmRuntime();
  const geminiKeys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean).length;
  const piiOptIn = /^(1|true|yes|on)$/i.test(process.env.LLM_ALLOW_FREE_PROVIDER_RESUME_PII ?? "");
  const derivedOptIn = /^(1|true|yes|on)$/i.test(process.env.LLM_ALLOW_FREE_PROVIDER_DERIVED_RESUME ?? "");
  const deterministic = !/^(0|false|no|off)$/i.test(process.env.LLM_ENABLE_DETERMINISTIC_FALLBACKS ?? "true");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <BrainCircuit className="h-5 w-5 text-primary" /> AI Operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Provider routing, privacy gates, deterministic fallbacks and LLM dependency health.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          icon={<Route className="h-4 w-4" />}
          label="Gemini keys"
          value={String(geminiKeys)}
          tone={geminiKeys > 0 ? "ok" : "warn"}
          sub={geminiKeys > 0 ? "Primary multimodal route" : "External/deterministic fallback only"}
        />
        <StatusCard
          icon={<Database className="h-4 w-4" />}
          label="Free providers"
          value={String(runtime.providers.length)}
          tone={runtime.providers.length > 0 ? "ok" : "warn"}
          sub={runtime.providers.length > 0 ? "OpenAI-compatible chain configured" : "Set LLM_PROVIDER_CHAIN"}
        />
        <StatusCard
          icon={<Lock className="h-4 w-4" />}
          label="Resume PII fallback"
          value={piiOptIn ? "On" : "Off"}
          tone={piiOptIn ? "warn" : "ok"}
          sub={piiOptIn ? "External resume routing enabled" : "Raw resumes stay on Gemini only"}
        />
        <StatusCard
          icon={<FileText className="h-4 w-4" />}
          label="Deterministic fallback"
          value={deterministic ? "On" : "Off"}
          tone={deterministic ? "ok" : "warn"}
          sub={deterministic ? "Crawler/matching degrade gracefully" : "LLM exhaustion may block enrichment"}
        />
      </section>

      <section className="space-y-2">
        <SectionTitle title="Provider Chain" subtitle="Secrets are never displayed; only key counts and capabilities." />
        {runtime.providers.length === 0 ? (
          <EmptyPanel text="No external providers configured. Gemini plus deterministic fallback will be used." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {runtime.providers.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.id}</p>
                    <p className="break-all text-[11px] text-muted-foreground">{p.baseUrl}</p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    {p.keyCount} key{p.keyCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <MiniStat label="Text model" value={p.textModel ?? "not set"} />
                  <MiniStat label="Embedding model" value={p.embeddingModel ?? "not set"} />
                  <MiniStat label="PDF support" value={p.supportsPdf ? "declared" : "no"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle title="Operation Policy" subtitle="What can leave Gemini, and what has deterministic backup." />
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="divide-y divide-border/50">
            {runtime.operations.map((op) => (
              <div key={op.id} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] md:items-center">
                <div>
                  <p className="font-medium">{op.label}</p>
                  <p className="text-[11px] text-muted-foreground">{op.id}</p>
                </div>
                <Badge value={op.sensitivity} tone={op.sensitivity === "public_jd" ? "ok" : op.sensitivity === "resume_pii" ? "warn" : "neutral"} />
                <Badge value={op.externalFallback.replaceAll("_", " ")} tone={op.externalFallback === "allowed" ? "ok" : "neutral"} />
                <Badge value={`deterministic: ${op.deterministicFallback}`} tone={op.deterministicFallback === "available" ? "ok" : "neutral"} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {derivedOptIn || piiOptIn ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> External resume fallback is enabled
          </p>
          <p className="mt-1 text-xs text-amber-100/80">
            Keep provider terms, data retention and DPDP disclosures reviewed. This page intentionally shows no keys or resume data.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({ icon, label, value, sub, tone }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn";
}) {
  const styles = tone === "ok"
    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
    : "border-amber-500/20 bg-amber-500/5 text-amber-300";
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${styles}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{sub}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone: "ok" | "warn" | "neutral" }) {
  const styles =
    tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
    tone === "warn" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
    "border-border bg-background/50 text-muted-foreground";
  return (
    <span className={`inline-flex w-fit rounded-full border px-2 py-1 text-[11px] font-medium capitalize ${styles}`}>
      {value}
    </span>
  );
}
