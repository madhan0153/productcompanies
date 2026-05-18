"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Check, Loader2, Trash2, ExternalLink } from "lucide-react";
import { trackJob, untrackJob, recordApplyClick } from "./actions";

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
  applyUrl?: string | null;
};

export function JobActions({ jobId, existingApp, applyUrl }: Props) {
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

  const onApply = () => {
    if (!applyUrl) return;
    const win = window.open(applyUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = applyUrl;
    start(async () => {
      const res = await recordApplyClick(jobId);
      if (res.ok) {
        setStatus("applied");
        toast.success("Opened apply page — tracked as applied");
        router.refresh();
      }
    });
  };

  if (status) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
          <Check className="h-3 w-3" /> {STATUS_LABEL[status]}
        </span>
        <select
          aria-label="Change status"
          disabled={pending}
          value={status}
          onChange={(e) => onTrack(e.target.value as Status)}
          className="tap-target rounded-full border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20"
        >
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onUntrack}
          disabled={pending}
          className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-ring"
        >
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {applyUrl && (
        <button
          type="button"
          onClick={onApply}
          disabled={pending}
          className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50 focus-ring"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
          Apply
        </button>
      )}
      <button
        type="button"
        onClick={() => onTrack("saved")}
        disabled={pending}
        className="press tap-target-sm inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50 focus-ring"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bookmark className="h-3 w-3" />}
        Save
      </button>
    </div>
  );
}
