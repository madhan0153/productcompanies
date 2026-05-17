"use client";

import { useTransition, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateAndStorePlan } from "./actions";

export function GenerateButton({ hasPlan }: { hasPlan: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await generateAndStorePlan();
            if (!r.ok) setError(r.reason);
          });
        }}
        disabled={pending}
        className="press tap-target inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 focus-ring"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Coaching…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> {hasPlan ? "Regenerate plan" : "Generate plan"}
          </>
        )}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
