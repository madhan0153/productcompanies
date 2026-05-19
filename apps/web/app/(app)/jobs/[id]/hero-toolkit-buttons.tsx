"use client";

import { FileDown, Eye } from "lucide-react";

// Standalone hero buttons that jump directly to Tailor Resume or Recruiter View
// in the Apply tab — no need to click the Apply tab then find the sub-tab.
// Uses a custom DOM event because ApplyToolkit is already mounted (just hidden)
// via the JobDetailTabs hidden-panel pattern.
export function HeroToolkitButtons() {
  const activate = (subTab: "tailor" | "recruiter") => {
    window.location.hash = "#apply";
    window.dispatchEvent(new CustomEvent("toolkit:tab", { detail: subTab }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => activate("tailor")}
        className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
      >
        <FileDown className="h-3 w-3" />
        Tailor Resume
      </button>
      <button
        type="button"
        onClick={() => activate("recruiter")}
        className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
      >
        <Eye className="h-3 w-3" />
        Recruiter View
      </button>
    </>
  );
}
