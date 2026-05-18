"use client";

// Profile tabs — segmented pill nav above the panels, same visual language
// as the matches band strip. Lets the user jump straight to the section
// they want instead of scrolling through everything.
//
// The page renders all panels server-side and passes them in by key; this
// component just toggles visibility. State lives in URL hash (#resume,
// #career, #details, #history) so back/forward + share-the-link both work.

import { useEffect, useState } from "react";
import { FileText, User, History } from "lucide-react";

export type ProfileTabId = "resume" | "details" | "history";

const TABS: Array<{ id: ProfileTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "resume",  label: "Resume",  icon: FileText },
  { id: "details", label: "Details", icon: User },
  { id: "history", label: "History", icon: History },
];

function parseHash(): ProfileTabId | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.replace(/^#/, "") as ProfileTabId;
  if (h === "resume" || h === "details" || h === "history") return h;
  return null;
}

export function ProfileTabs({
  initial = "resume",
  panels,
}: {
  initial?: ProfileTabId;
  /** Pre-rendered panels keyed by tab id. */
  panels: Record<ProfileTabId, React.ReactNode>;
}) {
  // SSR-safe: start with the server-provided default, then sync to hash on mount.
  const [active, setActive] = useState<ProfileTabId>(initial);

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

  function select(id: ProfileTabId) {
    setActive(id);
    if (typeof window !== "undefined") {
      // Use history.replaceState so changing tabs doesn't pollute back/forward.
      // The user can still share #resume etc. by copying the URL.
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <>
      <nav
        aria-label="Profile sections"
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
                  aria-controls={`profile-panel-${t.id}`}
                  id={`profile-tab-${t.id}`}
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
          id={`profile-panel-${t.id}`}
          aria-labelledby={`profile-tab-${t.id}`}
          hidden={t.id !== active}
          className={t.id === active ? "space-y-4" : ""}
        >
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
