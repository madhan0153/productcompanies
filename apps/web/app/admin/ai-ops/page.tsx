import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { describeLlmRuntime } from "@prodmatch/shared";
import { Badge, Card, KPI, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · AI Ops" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAiOpsPage() {
  const runtime = describeLlmRuntime();
  const geminiKeys    = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean).length;
  const killSwitch    = /^(1|true|yes|on)$/i.test(process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS ?? "");
  const deterministic = !/^(0|false|no|off)$/i.test(process.env.LLM_ENABLE_DETERMINISTIC_FALLBACKS ?? "true");

  const configuredCount = runtime.providers.length;
  const totalPresets    = runtime.presets.length;
  const partialCount    = runtime.presets.filter((p) => p.state === "partial").length;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · AI Ops
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          AI Operations
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Hardcoded provider chain. Operators configure API keys only — URLs, models, and capabilities live in code.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Gemini keys"      value={String(geminiKeys)}                  hint={geminiKeys > 0 ? "primary route" : "fallback only"} accent />
        <KPI label="Providers ready"  value={`${configuredCount}/${totalPresets}`} hint={partialCount > 0 ? `${partialCount} partial` : "auto-detected"} />
        <KPI label="Kill switch"      value={killSwitch ? "ON" : "OFF"}           hint={killSwitch ? "external blocked" : "external enabled"} />
        <KPI label="Det. fallback"    value={deterministic ? "On" : "Off"}        hint="graceful degrade" />
      </div>

      <SectionHeader title="Provider presets" sub="Set the listed env var to enable a preset." />
      <Card p={0}>
        {runtime.presets.map((preset, i) => {
          const detail = runtime.providers.find((p) => p.id === preset.id);
          const Icon = preset.state === "active"  ? <CheckCircle2 size={16} style={{ color: "var(--ok)", flexShrink: 0 }} />
                     : preset.state === "partial" ? <AlertTriangle size={16} style={{ color: "var(--warn)", flexShrink: 0 }} />
                                                  : <XCircle size={16} style={{ color: "var(--text-3)", flexShrink: 0 }} />;
          const tone: "ok" | "warn" | "neutral" =
            preset.state === "active" ? "ok" : preset.state === "partial" ? "warn" : "neutral";
          const stateLabel =
            preset.state === "active"  ? "IN CHAIN" :
            preset.state === "partial" ? "PARTIAL"  :
                                         "idle";
          return (
            <div
              key={preset.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr 1fr auto",
                gap: 14,
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < runtime.presets.length - 1 ? "1px solid var(--line-2)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {Icon}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{preset.label}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {preset.id}{preset.embeddingsOnly ? " · embeddings only" : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {preset.requiredEnvVars.map((v) => {
                  const missing = preset.missingEnvVars.includes(v);
                  return (
                    <code
                      key={v}
                      style={{
                        padding: "2px 6px", borderRadius: 4,
                        fontSize: 11, fontFamily: "var(--font-mono)",
                        background: missing ? "var(--warn-soft)" : "var(--surface-2)",
                        color:      missing ? "var(--warn)"      : "var(--text)",
                        textDecoration: missing ? "line-through" : "none",
                      }}
                    >
                      {v}
                    </code>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                {detail ? (
                  <>
                    <span style={{ color: "var(--text)" }} className="pm-num">{detail.keyCount}</span> key
                    {detail.keyCount === 1 ? "" : "s"} · {detail.textModels.length} text · {detail.embeddingModel ? "1" : "0"} embed
                  </>
                ) : preset.state === "partial" ? (
                  <span>missing: {preset.missingEnvVars.join(", ")}</span>
                ) : (
                  <span>not configured</span>
                )}
              </div>
              <Badge tone={tone}>{stateLabel}</Badge>
            </div>
          );
        })}
      </Card>

      {runtime.providers.length > 0 && (
        <>
          <SectionHeader title="Active model cascade" sub="Order tried per provider — each (model × key) has its own dead-key tracker." />
          <div style={{
            display: "grid", gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}>
            {runtime.providers.map((p) => (
              <Card key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-3)", wordBreak: "break-all" }}>{p.baseUrl}</p>
                  </div>
                  <Badge tone="accent" size="sm">{p.keyCount} key{p.keyCount === 1 ? "" : "s"}</Badge>
                </div>
                <p style={{ marginTop: 12, fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Text model cascade
                </p>
                <ol style={{ marginTop: 6, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.textModels.map((m, idx) => (
                    <li key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{
                        display: "inline-flex", width: 20, height: 20, borderRadius: 4,
                        background: "var(--surface-2)", border: "1px solid var(--line)",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "var(--text-3)",
                      }} className="pm-num">
                        {idx + 1}
                      </span>
                      <code style={{
                        padding: "2px 6px", borderRadius: 4,
                        background: "var(--surface-2)", fontFamily: "var(--font-mono)",
                        fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{m}</code>
                    </li>
                  ))}
                </ol>
                {p.embeddingModel && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Embedding</p>
                    <code style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{p.embeddingModel}</code>
                  </div>
                )}
                {p.supportsPdf && (
                  <p style={{ marginTop: 8, fontSize: 11, color: "var(--ok)" }}>Supports PDF input</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Operation policy" sub="All ops roll over to the free provider chain when Gemini exhausts." />
      <Card p={0}>
        {runtime.operations.map((op, i) => (
          <div
            key={op.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.8fr 0.8fr 0.8fr",
              gap: 12,
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: i < runtime.operations.length - 1 ? "1px solid var(--line-2)" : "none",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{op.label}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)" }}>{op.id}</p>
            </div>
            <Badge tone={op.sensitivity === "public_jd" ? "ok" : op.sensitivity === "resume_pii" ? "warn" : "neutral"}>
              {op.sensitivity.replaceAll("_", " ")}
            </Badge>
            <Badge tone={op.externalFallback === "allowed" ? "ok" : "neutral"}>
              {op.externalFallback.replaceAll("_", " ")}
            </Badge>
            <Badge tone={op.deterministicFallback === "available" ? "ok" : "neutral"}>
              det: {op.deterministicFallback}
            </Badge>
          </div>
        ))}
      </Card>

      <div style={{
        marginTop: 22, padding: 14, borderRadius: 12,
        background: "var(--warn-soft)",
        border: "1px solid color-mix(in oklab, var(--warn) 30%, transparent)",
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warn)", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={16} /> Policy
        </p>
        <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>
          Resume PDFs and derived resume facts may flow through any configured provider when Gemini is exhausted.
          Candidates already consent to sharing their resume with employers; routing through inference providers is a derived
          processor use. Set <code style={{ background: "var(--surface)", padding: "1px 4px", borderRadius: 4 }}>
          LLM_FORCE_BLOCK_FREE_PROVIDERS=true</code> for emergency stop.
        </p>
      </div>
    </div>
  );
}
