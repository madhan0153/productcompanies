"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  plan:            "free" | "pro" | "career_sprint";
  hasSubscription: boolean;
  cancelPending:   boolean;
}

const CANCEL_REASONS: Array<{ key: string; label: string; retention?: string }> = [
  { key: "too_expensive",  label: "Too expensive",            retention: "Many users find Career Sprint pays for itself in one offer. Or, switch to monthly for full flexibility." },
  { key: "no_jobs",        label: "Not finding the right roles", retention: "We're adding ~30 new roles per day. Try our Career Sprint queue for first dibs." },
  { key: "got_job",        label: "I got a job 🎉",            retention: "Huge congratulations! We'd love a quick note about which role." },
  { key: "missing_feature",label: "Missing a feature",         retention: "Tell us what's missing — we read every reply." },
  { key: "other",          label: "Other",                     retention: undefined },
];

export function BillingActions({ plan, hasSubscription, cancelPending }: Props) {
  if (plan === "free") {
    return (
      <Link
        href="/pricing"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Upgrade plan
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    );
  }

  if (cancelPending) {
    return (
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Re-activate from pricing.</p>
        <Link href="/pricing" className="text-xs font-semibold text-primary hover:underline">
          Pricing →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/pricing"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-secondary"
      >
        Change plan
      </Link>
      {hasSubscription && <CancelButton />}
    </div>
  );
}

function CancelButton() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"reason" | "retain" | "confirming">("reason");
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote]     = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [done, setDone]     = useState<string | null>(null);

  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } };
  const sheet = reduce ? {} : {
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 },
    transition: { duration: 0.2 },
  };

  function close() {
    setOpen(false);
    setTimeout(() => { setStage("reason"); setReason(null); setNote(""); setError(null); setDone(null); }, 300);
  }

  async function confirmCancel() {
    setStage("confirming");
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: `${reason ?? "unspecified"}${note ? ` :: ${note.slice(0, 140)}` : ""}`, immediate: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Cancellation failed. Try again or contact support.");
        setStage("reason");
        return;
      }
      setDone(data.message ?? "Subscription cancelled. You keep access until the end of the billing period.");
      // Refresh page data after a beat
      setTimeout(() => router.refresh(), 800);
    } catch {
      setError("Network error. Please try again.");
      setStage("reason");
    }
  }

  const selectedReason = reason ? CANCEL_REASONS.find((r) => r.key === reason) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400"
      >
        Cancel
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...fade}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
            onClick={close}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              {...sheet}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-pop sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <p className="text-sm font-semibold">
                  {done ? "Cancelled" : stage === "reason" ? "Cancel subscription" : "Before you go"}
                </p>
                <button onClick={close} className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {done ? (
                <div className="space-y-3 px-5 py-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="font-semibold">{done}</p>
                  <button onClick={close} className="mx-auto inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                    Got it
                  </button>
                </div>
              ) : stage === "reason" ? (
                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs text-muted-foreground">
                    A quick reason helps us improve. We won't email you a follow-up unless you ask.
                  </p>
                  <div className="space-y-1.5">
                    {CANCEL_REASONS.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setReason(r.key)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          reason === r.key
                            ? "border-primary bg-primary/8"
                            : "border-border bg-background hover:bg-secondary"
                        }`}
                      >
                        <span>{r.label}</span>
                        {reason === r.key && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>

                  {reason === "other" && (
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Tell us more (optional)"
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}

                  {error && (
                    <p className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 p-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={close}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                    >
                      Keep subscription
                    </button>
                    <button
                      disabled={!reason}
                      onClick={() => selectedReason?.retention ? setStage("retain") : confirmCancel()}
                      className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : stage === "retain" ? (
                <div className="space-y-3 px-5 py-4">
                  <p className="text-sm font-semibold">{selectedReason?.label}</p>
                  <p className="text-sm text-muted-foreground">{selectedReason?.retention}</p>
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <button
                      onClick={close}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Keep subscription
                    </button>
                    <button
                      onClick={confirmCancel}
                      className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                    >
                      Cancel anyway
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Cancelling…</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
