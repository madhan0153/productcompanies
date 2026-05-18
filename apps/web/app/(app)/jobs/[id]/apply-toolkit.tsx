"use client";

import { useState, useTransition } from "react";
import {
  Sparkles, FileDown, Eye, IndianRupee, Loader2, RefreshCw,
  Copy, Check, AlertCircle, ExternalLink, Mail, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateTailoredResumeAction,
  generateNegotiationMemoAction,
  getTailoredResumeDownloadUrl,
  type TailorResult, type MemoResult,
} from "./toolkit-actions";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";
import type { NegotiationMemoContent } from "@/lib/llm/prompts/negotiation-memo";
import type { CompBracket } from "@/lib/insights/comp-percentiles";

// Sprint 5 — Apply Toolkit shell.
//
// Three-tab client component that surfaces:
//   - "Recruiter view"  (server-rendered passthrough via children prop)
//   - "Tailor resume"   (Feature 34a)
//   - "Negotiation memo" (Feature 34c)
//
// State stays in the client (tab + generation results) so users can switch
// tabs without losing the just-generated artifact. Generation results are
// also persisted server-side (see toolkit-actions.ts) so a full page
// reload restores them.

// Sprint 6 — Tailor leads. The Recruiter view is analytical; what an
// Indian engineer applying to product companies actually wants is the
// tailored resume + the negotiation memo, in that order. Recruiter view
// is kept as the third tab for diagnostics.
type Tab = "tailor" | "memo" | "recruiter";

interface CachedTailor {
  content: TailoredResumeContent;
  download_url: string;
  generated_at: string;
}

interface CachedMemo {
  content: NegotiationMemoContent;
  market_comp: CompBracket | null;
  generated_at: string;
}

interface Props {
  jobId: string;
  jobTitle: string;
  companyName: string;
  hasResume: boolean;
  matchingConsent: boolean;
  recruiterView: React.ReactNode;
  /** Initial server-loaded artifacts (when present). Lets the page paint
   *  in the just-cached state without a client-side roundtrip. */
  initialTailor: CachedTailor | null;
  initialMemo: CachedMemo | null;
}

export function ApplyToolkit({
  jobId, jobTitle, companyName,
  hasResume, matchingConsent,
  recruiterView,
  initialTailor, initialMemo,
}: Props) {
  const [tab, setTab] = useState<Tab>("tailor");

  // Block all three when the user can't actually use them.
  if (!hasResume) {
    return (
      <ToolkitGate
        icon={<Sparkles className="h-4 w-4" />}
        title="Upload your resume to unlock the Apply Toolkit"
        body="The toolkit needs your resume to tailor a JD-targeted version, score against the ATS, and build your negotiation memo."
        actionLabel="Upload resume"
        actionHref="/profile"
      />
    );
  }
  if (!matchingConsent) {
    return (
      <ToolkitGate
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Enable AI Matching consent"
        body="The Apply Toolkit uses AI to tailor your resume and draft negotiation language. Enable matching consent in Settings → Privacy."
        actionLabel="Open privacy settings"
        actionHref="/settings/privacy"
      />
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-soft-foreground">
            <Sparkles className="h-3 w-3" /> Apply Toolkit
          </div>
          <h2 className="mt-2 text-sm font-semibold">Take this application further</h2>
        </div>
      </header>

      <div role="tablist" aria-label="Apply Toolkit" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border px-2 pt-2">
        <TabButton selected={tab === "tailor"} onClick={() => setTab("tailor")} icon={<FileDown className="h-3.5 w-3.5" />}>
          Tailor resume
        </TabButton>
        <TabButton selected={tab === "memo"} onClick={() => setTab("memo")} icon={<IndianRupee className="h-3.5 w-3.5" />}>
          Negotiation memo
        </TabButton>
        <TabButton selected={tab === "recruiter"} onClick={() => setTab("recruiter")} icon={<Eye className="h-3.5 w-3.5" />}>
          Recruiter view
        </TabButton>
      </div>

      <div className="p-4">
        {tab === "recruiter" && (
          <div role="tabpanel">{recruiterView}</div>
        )}
        {tab === "tailor" && (
          <div role="tabpanel">
            <TailorTab jobId={jobId} initial={initialTailor} />
          </div>
        )}
        {tab === "memo" && (
          <div role="tabpanel">
            <MemoTab
              jobId={jobId}
              companyName={companyName}
              jobTitle={jobTitle}
              initial={initialMemo}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  selected, onClick, icon, children,
}: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={
        "tap-target-sm inline-flex shrink-0 items-center gap-1.5 rounded-t-md px-3 py-2 text-xs font-semibold transition focus-ring " +
        (selected
          ? "border border-border border-b-card bg-card text-foreground -mb-px"
          : "border border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ToolkitGate({
  icon, title, body, actionLabel, actionHref,
}: {
  icon: React.ReactNode; title: string; body: string;
  actionLabel: string; actionHref: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-primary/40 bg-primary-soft p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          <a
            href={actionHref}
            className="press tap-target-sm mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Resume tailoring panel ──────────────────────────────────────────────────

function TailorTab({ jobId, initial }: { jobId: string; initial: CachedTailor | null }) {
  const [pending, start] = useTransition();
  const [data, setData] = useState<CachedTailor | null>(initial);
  const [error, setError] = useState<string | null>(null);

  function trigger(force: boolean) {
    setError(null);
    start(async () => {
      const r: TailorResult = await generateTailoredResumeAction(jobId, { force });
      if (!r.ok) {
        setError(r.error);
        toast.error("Couldn't tailor the resume", { description: r.error });
        return;
      }
      setData({ content: r.content, download_url: r.download_url, generated_at: r.generated_at });
      toast.success(r.cached ? "Loaded cached tailored resume" : "Tailored resume generated", {
        description: "Click Download to save the .docx",
      });
    });
  }

  async function refreshSignedUrl() {
    const r = await getTailoredResumeDownloadUrl(jobId);
    if (r.ok) {
      setData((prev) => (prev ? { ...prev, download_url: r.url } : prev));
      window.open(r.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Download link expired — regenerate the resume.");
    }
  }

  if (!data) {
    return (
      <EmptyStateGenerate
        title="Tailor your resume for this role"
        body="Generates a JD-targeted .docx using your parsed resume + the JD's must-haves + your Fit Card's pre-approved tweaks. Caches per role — re-runs are instant."
        ctaLabel="Generate tailored resume"
        ctaIcon={<FileDown className="h-3.5 w-3.5" />}
        onClick={() => trigger(false)}
        pending={pending}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tailored resume ready</p>
          <p className="text-sm">
            <strong>{data.content.header.name}</strong> · {data.content.header.title}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Generated {new Date(data.generated_at).toLocaleString()}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshSignedUrl()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <FileDown className="h-3.5 w-3.5" />
            Download .docx
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => trigger(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        </div>
      </div>

      {data.content.tailoring_notes && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">What changed</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.content.tailoring_notes}</p>
        </div>
      )}

      <TailoredResumePreview content={data.content} />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function TailoredResumePreview({ content }: { content: TailoredResumeContent }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-5 font-serif text-foreground/90">
      <header className="border-b border-border pb-3 text-center">
        <h3 className="text-lg font-bold tracking-tight">{content.header.name}</h3>
        <p className="text-xs text-muted-foreground">{content.header.title} · {content.header.location}</p>
        <p className="text-[11px] text-muted-foreground/80">{content.header.contact_line}</p>
      </header>

      {content.summary && (
        <Section label="Summary">
          <p className="text-xs leading-relaxed text-muted-foreground">{content.summary}</p>
        </Section>
      )}

      {content.skills.length > 0 && (
        <Section label="Skills">
          <ul className="space-y-1">
            {content.skills.map((g) => (
              <li key={g.group} className="text-xs">
                <strong className="text-foreground">{g.group}:</strong>{" "}
                <span className="text-muted-foreground">{g.items.join(", ")}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {content.experience.length > 0 && (
        <Section label="Experience">
          <ul className="space-y-3">
            {content.experience.map((e, i) => (
              <li key={i}>
                <p className="text-xs">
                  <strong className="text-foreground">{e.role}</strong>
                  {" · "}
                  <span className="text-muted-foreground">{e.company}</span>
                  {" · "}
                  <span className="italic text-muted-foreground/80">{e.duration}</span>
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 pl-1 text-xs text-muted-foreground">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {content.projects && content.projects.length > 0 && (
        <Section label="Selected projects">
          <ul className="space-y-2">
            {content.projects.map((p, i) => (
              <li key={i} className="text-xs">
                <strong className="text-foreground">{p.name}</strong>
                {p.tech.length > 0 && <span className="text-muted-foreground/80"> — {p.tech.join(", ")}</span>}
                <p className="mt-0.5 text-muted-foreground">{p.summary}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {content.education.length > 0 && (
        <Section label="Education">
          <ul className="space-y-1 text-xs">
            {content.education.map((e, i) => (
              <li key={i}>
                <strong className="text-foreground">{e.degree}</strong>
                {" · "}
                <span className="text-muted-foreground">{e.institution}</span>
                {e.year ? <span className="text-muted-foreground/80"> · {e.year}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <p className="mb-1 border-b border-border pb-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">{label}</p>
      {children}
    </section>
  );
}

// ── Negotiation memo panel ──────────────────────────────────────────────────

function MemoTab({ jobId, companyName, jobTitle, initial }: {
  jobId: string; companyName: string; jobTitle: string; initial: CachedMemo | null;
}) {
  const [pending, start] = useTransition();
  const [data, setData] = useState<CachedMemo | null>(initial);
  const [error, setError] = useState<string | null>(null);

  function trigger(force: boolean) {
    setError(null);
    start(async () => {
      const r: MemoResult = await generateNegotiationMemoAction(jobId, { force });
      if (!r.ok) {
        setError(r.error);
        toast.error("Couldn't generate memo", { description: r.error });
        return;
      }
      setData({ content: r.content, market_comp: r.market_comp, generated_at: r.generated_at });
      toast.success(r.cached ? "Loaded cached memo" : "Negotiation memo ready");
    });
  }

  if (!data) {
    return (
      <EmptyStateGenerate
        title={`Build your negotiation memo for ${companyName}`}
        body="Anchors target offer + walkaway threshold on live market percentiles. Includes paste-ready email templates and ESOP-vs-cash guidance."
        ctaLabel="Generate negotiation memo"
        ctaIcon={<IndianRupee className="h-3.5 w-3.5" />}
        onClick={() => trigger(false)}
        pending={pending}
        error={error}
      />
    );
  }

  const c = data.content;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negotiation memo</p>
          <p className="text-sm"><strong>{jobTitle}</strong> at {companyName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Generated {new Date(data.generated_at).toLocaleString()}
            {data.market_comp ? ` · Anchored on n=${data.market_comp.n} active postings` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
          >
            <FileDown className="h-3.5 w-3.5" />
            Print / save PDF
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => trigger(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
        </div>
      </div>

      {/* Executive summary */}
      <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-soft-foreground/80">Executive summary</p>
        <p className="mt-1 text-sm leading-relaxed">{c.executive_summary}</p>
      </div>

      {/* Market anchor */}
      <Card title="Market anchor" icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />}>
        <p className="text-sm text-muted-foreground">{c.market_anchor.note}</p>
        {c.market_anchor.sample_size != null && (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <CompCell label="Median" value={c.market_anchor.median_lpa} />
            <CompCell label="p75" value={c.market_anchor.p75_lpa} highlight />
            <CompCell label="p90" value={c.market_anchor.p90_lpa} />
          </div>
        )}
      </Card>

      {/* Target offer */}
      <Card title="Recommended target offer" icon={<IndianRupee className="h-3.5 w-3.5 text-primary" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OfferCell label="Base"        value={c.target_offer.base_lpa} />
          <OfferCell label="Variable"    value={c.target_offer.variable_lpa} />
          <OfferCell label="ESOPs (yr)"  value={c.target_offer.esop_value_lpa} />
          <OfferCell label="Joining bns" value={c.target_offer.joining_bonus_lpa} />
        </div>
        {c.target_offer.total_lpa != null && (
          <p className="mt-3 text-sm">
            <strong>Total target: ₹{c.target_offer.total_lpa} LPA</strong>
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{c.target_offer.rationale}</p>
      </Card>

      {/* Walkaway */}
      <Card title="Walkaway threshold" icon={<AlertCircle className="h-3.5 w-3.5 text-destructive" />}>
        {c.walkaway_threshold.lpa != null ? (
          <p className="text-sm">
            <strong className="text-destructive">Don&apos;t accept below ₹{c.walkaway_threshold.lpa} LPA.</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No specific threshold — see rationale.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{c.walkaway_threshold.rationale}</p>
      </Card>

      {/* Talking points */}
      {c.talking_points.length > 0 && (
        <Card title="Talking points" icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}>
          <ul className="space-y-1.5">
            {c.talking_points.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                <span className="mr-2 font-semibold text-foreground">{i + 1}.</span>{t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Counter-offer + response emails — copy buttons */}
      <CopyableEmail label="Counter-offer email (paste-ready)" subject={c.counter_offer_email.subject} body={c.counter_offer_email.body} />
      <CopyableEmail label="If they push back" subject={c.response_email.subject} body={c.response_email.body} />

      {/* ESOP vs cash + risks */}
      <Card title="ESOPs vs cash" icon={<IndianRupee className="h-3.5 w-3.5 text-warning" />}>
        <p className="text-xs leading-relaxed text-muted-foreground">{c.esop_vs_cash}</p>
      </Card>

      {c.risk_flags.length > 0 && (
        <Card title="Risk flags" icon={<AlertCircle className="h-3.5 w-3.5 text-destructive" />}>
          <ul className="space-y-1.5">
            {c.risk_flags.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">· {r}</li>
            ))}
          </ul>
        </Card>
      )}

      <p className="border-t border-border pt-3 text-[10px] text-muted-foreground/70">
        This memo is grounded in ProdMatch&apos;s live catalog of {data.market_comp?.n ?? "?"} active postings.
        Numbers are estimates — your actual offer terms determine the final ask.
      </p>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function CompCell({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? "border-success/30 bg-success/5" : "border-border bg-secondary/40"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${highlight ? "text-success" : ""}`}>
        {value != null ? `₹${value}` : "—"}
      </p>
    </div>
  );
}

function OfferCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value != null ? `₹${value} LPA` : "—"}</p>
    </div>
  );
}

function CopyableEmail({ label, subject, body }: { label: string; subject: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const full = `Subject: ${subject}\n\n${body}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5 text-primary" /> {label}
        </p>
        <div className="flex items-center gap-2">
          <a
            href={mailto}
            className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
          >
            <ExternalLink className="h-3 w-3" /> Open in mail
          </a>
          <button
            type="button"
            onClick={copy}
            className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </header>
      <div className="space-y-1.5 px-4 py-3">
        <p className="text-xs"><strong>Subject:</strong> {subject}</p>
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{body}</pre>
      </div>
    </div>
  );
}

// ── Shared empty-state CTA used by both LLM panels ─────────────────────────

function EmptyStateGenerate({
  title, body, ctaLabel, ctaIcon, onClick, pending, error,
}: {
  title: string; body: string; ctaLabel: string; ctaIcon: React.ReactNode;
  onClick: () => void; pending: boolean; error: string | null;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-5">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ctaIcon}
        {pending ? "Generating…" : ctaLabel}
      </button>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
