"use client";

import { useState, useTransition } from "react";
import { History, Undo2, CheckCircle2, AlertCircle } from "lucide-react";
import { revertResumeToVersion, type ResumeVersionLite } from "./actions";

// Sprint 2 — Item 8. Snapshots list + one-click revert.

export function ResumeVersionsPanel({ versions }: { versions: ResumeVersionLite[] }) {
  if (versions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-5 text-center">
        <p className="text-xs text-muted-foreground">
          No prior versions yet. We snapshot your resume automatically before every re-upload so you can revert.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border/50 px-5 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Resume history</p>
          <p className="text-xs text-muted-foreground">Snapshots taken before each overwrite. Last 5 kept per user.</p>
        </div>
      </div>
      <ul className="divide-y divide-border/40">
        {versions.map((v) => (
          <VersionRow key={v.id} version={v} />
        ))}
      </ul>
    </div>
  );
}

function VersionRow({ version }: { version: ResumeVersionLite }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const when = new Date(version.created_at).toLocaleString();
  const sourceLabel = version.source === "manual_revert" ? "Snapshot before revert" : "Snapshot before re-upload";

  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{version.current_role ?? "—"}</span>
          {version.total_years_experience != null && (
            <span className="text-xs text-muted-foreground">
              · {version.total_years_experience}y exp
            </span>
          )}
          {version.product_dna_score != null && (
            <span className="rounded-full border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] tabular-nums">
              DNA {version.product_dna_score}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {sourceLabel} · {when}
        </p>
      </div>
      {done ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Reverted
        </span>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await revertResumeToVersion(version.id);
              if (res.ok) setDone(true);
              else setError(res.error);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          <Undo2 className="h-3 w-3" />
          {isPending ? "Reverting…" : "Revert"}
        </button>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </li>
  );
}
