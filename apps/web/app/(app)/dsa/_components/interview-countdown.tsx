"use client";

import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

// Career Sprint working feature: set an interview date (persisted locally) and
// see a live daily countdown with a focus line. No backend required.

const KEY = "dsa_interview_date";

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function InterviewCountdown() {
  const [date, setDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setDate(saved);
    } catch { /* ignore */ }
  }, []);

  function save() {
    if (!draft) return;
    try { localStorage.setItem(KEY, draft); } catch { /* ignore */ }
    setDate(draft);
    setEditing(false);
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setDate(null);
    setEditing(false);
  }

  const days = date ? daysUntil(date) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" /> Interview Countdown
        </p>
        {date && !editing && (
          <button type="button" onClick={() => { setDraft(date); setEditing(true); }} className="text-xs font-semibold text-primary hover:underline focus-ring">
            Change
          </button>
        )}
      </div>

      {date && days !== null && !editing ? (
        <div className="mt-2">
          {days >= 0 ? (
            <>
              <p className="text-2xl font-semibold tabular-nums">
                {days} <span className="text-sm font-medium text-muted-foreground">day{days === 1 ? "" : "s"} to go</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {days === 0
                  ? "It's today — do a light recall set and rest. You've got this."
                  : days <= 7
                  ? "Final stretch: one fresh question + one recall daily until the day."
                  : "On plan: one daily question keeps your patterns sharp. Recall ramps up in the last week."}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">That date has passed — set a new one when your next interview is booked.</p>
          )}
          <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground focus-ring">
            <X className="h-3 w-3" /> Clear date
          </button>
        </div>
      ) : editing || !date ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            min={today}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="tap-target flex-1 rounded-lg border border-input bg-background px-3 py-2 text-base focus-ring sm:text-sm"
            aria-label="Interview date"
          />
          <button
            type="button"
            onClick={save}
            disabled={!draft}
            className="press tap-target rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
          >
            Set date
          </button>
        </div>
      ) : null}
    </div>
  );
}
