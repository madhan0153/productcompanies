"use client";

// Shown at the top of /profile while resume_parsing_at is set on the row.
// Covers the case where the user uploaded, then navigated away or refreshed
// before the background parse finished. Polls the same getParseStatus()
// endpoint the upload component uses; refreshes the page when the parse
// completes so the rest of the profile re-renders with the new data.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { getParseStatus } from "./actions";

export function ParseStatusBanner({
  initialStartedAt,
  initialError,
  hasActiveResume,
}: {
  initialStartedAt: string | null;
  initialError:     string | null;
  hasActiveResume:  boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [parsing, setParsing] = useState(initialStartedAt !== null);
  const [error,   setError]   = useState<string | null>(initialError);

  useEffect(() => {
    if (!parsing) return;
    let cancelled = false;
    const HARD_CAP_MS = 3 * 60 * 1000;
    const startMs = Date.now();

    async function tick() {
      if (cancelled) return;
      try {
        const status = await getParseStatus();
        if (cancelled) return;
        if (status.state === "done") {
          setParsing(false);
          setError(null);
          router.refresh();
          return;
        }
        if (status.state === "failed") {
          setParsing(false);
          setError(status.error);
          return;
        }
      } catch {
        // network blip — keep polling
      }
      if (Date.now() - startMs > HARD_CAP_MS) {
        setParsing(false);
        return;
      }
      setTimeout(tick, 4000);
    }
    const initial = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [parsing, router]);

  if (parsing) {
    return (
      <motion.div
        initial={reduce ? {} : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3"
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Resume parse in progress
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Our AI is reading your PDF. This page will update automatically when it&apos;s done — usually 15–30 seconds.
          </p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    const fallback = hasActiveResume;
    return (
      <motion.div
        initial={reduce ? {} : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={[
          "flex items-start gap-3 rounded-xl border px-4 py-3",
          fallback
            ? "border-warning/30 bg-warning/5 text-warning"
            : "border-destructive/30 bg-destructive/5 text-destructive",
        ].join(" ")}
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {fallback ? "New resume parse failed" : "Resume parse failed"}
          </p>
          <p className={["mt-0.5 text-xs", fallback ? "text-warning/85" : "text-destructive/80"].join(" ")}>
            {error}
          </p>
          <p className={["mt-1 text-xs", fallback ? "text-warning/85" : "text-destructive/80"].join(" ")}>
            {fallback
              ? "Your previous parsed resume is still active for matches. Re-upload the PDF below when ready."
              : "Re-upload the PDF below to retry."}
          </p>
        </div>
      </motion.div>
    );
  }

  return null;
}
