"use client";

import { useState, useRef, useId } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { addApplication } from "./actions";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Job = { id: string; title: string; company: string };

const STATUS_OPTIONS = [
  "saved", "applied", "interviewing", "offer", "rejected", "withdrawn",
] as const;

export function AddApplicationButton({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();

  const close = () => setOpen(false);
  useEscapeKey(open ? close : () => {});
  const trapRef = useFocusTrap(open);

  const filtered = query.length > 0
    ? jobs.filter((j) =>
        j.title.toLowerCase().includes(query.toLowerCase()) ||
        j.company.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : jobs.slice(0, 8);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await addApplication(fd);
    setPending(false);
    setOpen(false);
    formRef.current?.reset();
    setQuery("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add application
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={trapRef}
            className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id={titleId} className="font-semibold">Add application</h2>
              <button
                onClick={close}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-5">
              {/* Job search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Job
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title or company…"
                  aria-label="Search jobs"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {filtered.length > 0 && (
                  <div
                    className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-card"
                    role="listbox"
                    aria-label="Matching jobs"
                  >
                    {filtered.map((j) => (
                      <label
                        key={j.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary"
                      >
                        <input
                          type="radio"
                          name="job_id"
                          value={j.id}
                          required
                          className="accent-[hsl(var(--primary))]"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{j.title}</span>
                          <span className="text-xs text-muted-foreground">{j.company}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {jobs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active jobs found. Check back after the next crawler run.
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  name="status"
                  defaultValue="saved"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Applied date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Applied date (optional)
                </label>
                <input
                  type="date"
                  name="applied_at"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Notes (optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Recruiter contact, referral, etc."
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Save application
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
