"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileDown, Eye, Loader2, RefreshCw,
  AlertCircle, ShieldCheck,
} from "lucide-react";
// Eye is still used in the TailorTab "Review changes" button shown AFTER generation.
import { toast } from "sonner";
import {
  generateTailoredResumeAction,
  getTailoredResumeDownloadUrl,
  type TailorResult,
} from "./toolkit-actions";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

// Sprint 5/6 — Apply Toolkit shell.
//
// Two-tab client component:
//   - "Tailor resume"  (Feature 34a) — default
//   - "Recruiter view" (ATS analytics passthrough via children)
//
// Sprint 7 — Negotiation memo tab removed. Most JDs in our catalog don't
// disclose comp bands, so the memo's market_comp anchor was unreliable
// and the tab consistently scored low on user value. The data remains in
// the DB for analytics but is no longer surfaced as a primary action.

type Tab = "tailor" | "recruiter";

interface CachedTailor {
  content: TailoredResumeContent;
  download_url: string;
  generated_at: string;
}

interface Props {
  jobId: string;
  jobTitle: string;
  companyName: string;
  hasResume: boolean;
  matchingConsent: boolean;
  recruiterView: React.ReactNode;
  /** Initial server-loaded artifact (when present). Lets the page paint
   *  in the just-cached state without a client-side roundtrip. */
  initialTailor: CachedTailor | null;
}

export function ApplyToolkit({
  jobId,
  hasResume, matchingConsent,
  recruiterView,
  initialTailor,
}: Props) {
  const [tab, setTab] = useState<Tab>("tailor");

  if (!hasResume) {
    return (
      <ToolkitGate
        icon={<Sparkles className="h-4 w-4" />}
        title="Upload your resume to unlock the Apply Toolkit"
        body="The toolkit needs your resume to tailor a JD-targeted version and score against the ATS."
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
        body="The Apply Toolkit uses AI to tailor your resume. Enable matching consent in Settings → Privacy."
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
        <TabButton selected={tab === "recruiter"} onClick={() => setTab("recruiter")} icon={<Eye className="h-3.5 w-3.5" />}>
          Recruiter view
        </TabButton>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {tab === "recruiter" && (
            <motion.div
              key="recruiter"
              role="tabpanel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {recruiterView}
            </motion.div>
          )}
          {tab === "tailor" && (
            <motion.div
              key="tailor"
              role="tabpanel"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <TailorTab jobId={jobId} initial={initialTailor} />
            </motion.div>
          )}
        </AnimatePresence>
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
        body="One-click: generates a JD-targeted .docx using your resume + the JD's must-haves. Cached per role — re-runs are instant."
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refreshSignedUrl()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <FileDown className="h-3.5 w-3.5" />
            Download .docx
          </button>
          <a
            href={`/jobs/${jobId}/tailor`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary-soft/80"
            title="Review proposed changes one by one"
          >
            <Eye className="h-3.5 w-3.5" />
            Review changes
          </a>
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

// ── Shared empty-state CTA ─────────────────────────────────────────────────

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
