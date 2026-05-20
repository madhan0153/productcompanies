import type { Metadata } from "next";
import { AlertTriangle, BrainCircuit, Database, FileText, Lock, Route, CheckCircle2, XCircle } from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";

export const metadata: Metadata = { title: "Admin · AI Ops" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAiOpsPage() {
  const runtime = describeLlmRuntime();
  const geminiKeys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean).length;
  const killSwitch = /^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? "");
  const deterministic = !/^(0|false|no|off)$/i.test(process.env.LLM_ENABLE_DETERMINISTIC_FALLBACKS ?? "true");

  const configuredCount = runtime.providers.length;
  const totalPresets = runtime.presets.length;
  const partialCount = runtime.presets.filter((p) => p.state === "partial").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <BrainCircuit className="h-5 w-5 text-primary" /> AI Operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Hardcoded provider chain. Operators configure API keys only &mdash; URLs, models and capabilities live in code.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          icon={<Route className="h-4 w-4" />}
          label="Gemini keys"
          value={String(geminiKeys)}
          tone={geminiKeys > 0 ? "ok" : "warn"}
          sub={geminiKeys > 0 ? "Primary multimodal route" : "Fallback chain only"}
        />
        <StatusCard
          icon={<Database className="h-4 w-4" />}
          label="Free providers configured"
          value={`${configuredCount} / ${totalPresets}`}
          tone={configuredCount > 0 ? "ok" : "warn"}
          sub={
            partialCount > 0
              ? `${partialCount} partial — see below`
              : configuredCount > 0 ? "Auto-detected via env keys" : "Set at least one provider key"
          }
        />
        <StatusCard
          icon={<Lock className="h-4 w-4" />}
          label="Kill switch"
          value={killSwitch ? "ON" : "OFF"}
          tone={killSwitch ? "warn" : "ok"}
          sub={killSwitch ? "LLM_FORCE_BLOCK_FREE_PROVIDERS=true" : "External chain enabled"}
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
        <SectionTitle
          title="Provider Presets"
          subtitle="All baseUrls, model cascades, and capabilities are hardcoded. Set the listed env var to enable a preset."
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="divide-y divide-border/50">
            {runtime.presets.map((preset) => {
              const detail = runtime.providers.find((p) => p.id === preset.id);
              const stateIcon =
                preset.state === "active" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> :
                preset.state === "partial" ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" /> :
                <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />;
              const stateBadge =
                preset.state === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
                preset.state === "partial" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" :
                "border-border bg-background/40 text-muted-foreground";
              const stateLabel =
                preset.state === "active" ? "IN CHAIN" :
                preset.state === "partial" ? "PARTIAL" :
                "idle";
              return (
                <div key={preset.id} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_1.4fr_1fr_auto] md:items-center">
                  <div className="flex items-center gap-2">
                    {stateIcon}
                    <div>
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {preset.id}
                        {preset.embeddingsOnly ? " · embeddings only" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {preset.requiredEnvVars.map((v) => {
                      const missing = preset.missingEnvVars.includes(v);
                      return (
                        <code
                          key={v}
                          className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] ${
                            missing
                              ? "bg-amber-500/10 text-amber-300 line-through decoration-amber-400/60"
                              : "bg-background/60 text-foreground"
                          }`}
                        >
                          {v}
                        </code>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {detail ? (
                      <>
                        <span className="text-foreground tabular-nums">{detail.keyCount}</span> key
                        {detail.keyCount === 1 ? "" : "s"} ·{" "}
                        <span className="text-foreground tabular-nums">{detail.textModels.length}</span> text · {detail.embeddingModel ? "1" : "0"} embed
                      </>
                    ) : preset.state === "partial" ? (
                      <span>missing: {preset.missingEnvVars.join(", ")}</span>
                    ) : (
                      <span>not configured</span>
                    )}
                  </div>
                  <div className="text-xs">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateBadge}`}>
                      {stateLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {runtime.providers.length > 0 && (
        <section className="space-y-2">
          <SectionTitle
            title="Active Model Cascade"
            subtitle="Order tried per provider. Each (model × key) has its own dead-key tracker."
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {runtime.providers.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="break-all text-[11px] text-muted-foreground">{p.baseUrl}</p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    {p.keyCount} key{p.keyCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Text model cascade</p>
                  <ol className="space-y-1">
                    {p.textModels.map((m, idx) => (
                      <li key={m} className="flex items-center gap-2 text-xs">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-background/60 text-[10px] tabular-nums text-muted-foreground">
                          {idx + 1}
                        </span>
                        <code className="truncate rounded bg-background/40 px-1.5 py-0.5 text-[11px]">{m}</code>
                      </li>
                    ))}
                  </ol>
                  {p.embeddingModel && (
                    <div className="pt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Embedding</p>
                      <code className="text-[11px]">{p.embeddingModel}</code>
                    </div>
                  )}
                  {p.supportsPdf && (
                    <p className="pt-1 text-[10px] text-emerald-400">Supports PDF input</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle
          title="Operation Policy"
          subtitle="All operations roll over to the free provider chain when Gemini exhausts."
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="divide-y divide-border/50">
            {runtime.operations.map((op) => (
              <div key={op.id} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] md:items-center">
                <div>
                  <p className="font-medium">{op.label}</p>
                  <p className="text-[11px] text-muted-foreground">{op.id}</p>
                </div>
                <Badge value={op.sensitivity.replaceAll("_", " ")} tone={op.sensitivity === "public_jd" ? "ok" : op.sensitivity === "resume_pii" ? "warn" : "neutral"} />
                <Badge value={op.externalFallback.replaceAll("_", " ")} tone={op.externalFallback === "allowed" ? "ok" : "neutral"} />
                <Badge value={`deterministic: ${op.deterministicFallback}`} tone={op.deterministicFallback === "available" ? "ok" : "neutral"} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> Policy
        </p>
        <p className="mt-1 text-xs text-amber-100/80">
          The product owner has accepted that resume PDFs and derived resume facts may flow through any configured
          provider when Gemini is exhausted. Candidates already consent to sharing their resume with employers; routing
          through inference providers is a derived processor use. Set <code>LLM_FORCE_BLOCK_FREE_PROVIDERS=true</code>{" "}
          if you ever need an emergency stop. No keys or resume content are displayed on this page.
        </p>
      </div>
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
