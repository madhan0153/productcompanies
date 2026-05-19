"use client";

// Job detail — top-level tab strip. Same pattern as ProfileTabs.
// Tabs: Fit (AI match analysis, USP-first) | Apply (toolkit) | Job (description)
// State lives in URL hash (#fit, #apply, #job) — back/forward + share work.

import { useEffect, useState } from "react";
import { Compass, FileDown, Eye, FileText } from "lucide-react";

export type JobTabId = "fit" | "tailor" | "recruiter" | "job";

const TABS: Array<{ id: JobTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "fit",       label: "Fit",           icon: Compass },
  { id: "tailor",    label: "Tailor resume",  icon: FileDown },
  { id: "recruiter", label: "Recruiter view", icon: Eye },
  { id: "job",       label: "Job",           icon: FileText },
];

function parseHash(): JobTabId | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.replace(/^#/, "") as JobTabId;
  if (h === "fit" || h === "tailor" || h === "recruiter" || h === "job") return h;
  return null;
}

export function JobDetailTabs({
  initial = "fit",
  panels,
}: {
  initial?: JobTabId;
  panels: Record<JobTabId, React.ReactNode>;
}) {
  const [active, setActive] = useState<JobTabId>(initial);

  useEffect(() => {
    const fromHash = parseHash();
    if (fromHash) setActive(fromHash);
    const onHash = () => {
      const h = parseHash();
      if (h) setActive(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function select(id: JobTabId) {
    setActive(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <>
      <nav
        aria-label="Job detail sections"
        className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <ul
          role="tablist"
          className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === active;
            return (
              <li key={t.id} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`job-panel-${t.id}`}
                  id={`job-tab-${t.id}`}
                  onClick={() => select(t.id)}
                  className={`press tap-target-sm inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-ring ${
                    isActive
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span>{t.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`job-panel-${t.id}`}
          aria-labelledby={`job-tab-${t.id}`}
          hidden={t.id !== active}
          className={t.id === active ? "space-y-4" : ""}
        >
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
