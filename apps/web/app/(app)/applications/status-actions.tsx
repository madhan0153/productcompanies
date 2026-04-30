"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { updateStatusAction } from "./actions";

type Status = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
const ALL: Status[] = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];

const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function StatusActions({ appId, currentStatus }: { appId: string; currentStatus: Status }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const move = (next: Status) => {
    start(async () => {
      const res = await updateStatusAction(appId, next);
      if (res?.ok) {
        toast.success(`Moved to ${STATUS_LABEL[next]}`);
        router.refresh();
      } else {
        toast.error(res?.error ?? "Update failed");
      }
    });
  };

  return (
    <>
      {/* Desktop: chips */}
      <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-2">
        <ArrowRight className="h-3 w-3" /> Move to:
      </span>
      <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
        {ALL.filter((s) => s !== currentStatus).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => move(s)}
            disabled={pending}
            className="rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Mobile: native select */}
      <label className="flex items-center gap-2 sm:hidden">
        <span className="text-xs text-muted-foreground">Move to</span>
        <select
          aria-label="Change application status"
          disabled={pending}
          value=""
          onChange={(e) => {
            const v = e.target.value as Status;
            if (v) move(v);
          }}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="">Select…</option>
          {ALL.filter((s) => s !== currentStatus).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </label>
    </>
  );
}
