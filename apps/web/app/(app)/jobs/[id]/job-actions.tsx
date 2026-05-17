"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Check, Loader2, Trash2 } from "lucide-react";
import { trackJob, untrackJob } from "./actions";

type Status = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

type Props = {
  jobId: string;
  existingApp: { id: string; status: string; applied_at: string | null; notes: string | null } | null;
};

export function JobActions({ jobId, existingApp }: Props) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status | null>(existingApp?.status as Status | null ?? null);
  const router = useRouter();

  const onTrack = (next: Status) => {
    start(async () => {
      const r = await trackJob(jobId, next);
      if (r.ok) {
        setStatus(next);
        toast.success(`${STATUS_LABEL[next]} — added to applications`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const onUntrack = () => {
    if (!existingApp) return;
    start(async () => {
      const r = await untrackJob(existingApp.id);
      if (r.ok) {
        setStatus(null);
        toast.success("Removed from applications");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  if (status) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <Check className="h-3.5 w-3.5" /> Tracked as {STATUS_LABEL[status]}
        </span>
        <select
          aria-label="Change status"
          disabled={pending}
          value={status}
          onChange={(e) => onTrack(e.target.value as Status)}
          className="tap-target rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20"
        >
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onUntrack}
          disabled={pending}
          className="press tap-target inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-ring"
        >
          <Trash2 className="h-3.5 w-3.5" /> Untrack
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onTrack("saved")}
        disabled={pending}
        className="press tap-target inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary disabled:opacity-50 focus-ring"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className="h-3.5 w-3.5" />}
        Save for later
      </button>
      <button
        type="button"
        onClick={() => onTrack("applied")}
        disabled={pending}
        className="press tap-target inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-soft-foreground transition hover:bg-primary/15 disabled:opacity-50 focus-ring"
      >
        Mark as applied
      </button>
    </div>
  );
}
