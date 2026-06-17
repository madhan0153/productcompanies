"use client";

// Project Translator — embeddable button + sheet.
//
// Plugged into the Reactive-Resume-style work editor: shows up next to a
// role's "Highlights" field. Tapping opens a sheet that walks bullets one
// at a time and offers a one-tap "Apply" to replace the bullet in place.
//
// Privacy: all calls go through the authenticated server action; nothing
// leaves the user's session boundary.

import { useState, useTransition } from "react";
import { Wrench, X, Loader2, Sparkles, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { translateBulletAction } from "@/app/(app)/lab/actions";

interface Props {
  bullets: string[];
  role: string;
  company: string;
  onReplace: (index: number, newBullet: string) => void;
}

export function ProjectTranslatorButton({ bullets, role, company, onReplace }: Props) {
  const [open, setOpen] = useState(false);
  if (bullets.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">
        Add a bullet first to use the Project Translator.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
      >
        <Wrench className="h-3 w-3" />
        Translate bullets to product-co language
      </button>
      {open && (
        <TranslatorSheet
          bullets={bullets}
          role={role}
          company={company}
          onReplace={onReplace}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function TranslatorSheet({
  bullets, role, company, onReplace, onClose,
}: Props & { onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    rewritten: string;
    follow_ups: string[];
    rationale: string;
  } | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const current = bullets[idx] ?? "";

  function next() {
    setResult(null);
    setIdx((i) => Math.min(i + 1, bullets.length - 1));
  }
  function prev() {
    setResult(null);
    setIdx((i) => Math.max(i - 1, 0));
  }

  function handleTranslate() {
    setFlash(null);
    setResult(null);
    startTransition(async () => {
      const res = await translateBulletAction({ bullet: current, role, company });
      if (res.ok && res.data) {
        setResult(res.data);
      } else {
        setFlash({ kind: "err", text: res.error ?? "Translate failed." });
      }
    });
  }

  function handleApply() {
    if (!result) return;
    onReplace(idx, result.rewritten);
    setFlash({ kind: "ok", text: "Applied. Don't forget to save the resume." });
    setResult(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Wrench className="h-4 w-4 text-primary" /> Project Translator
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {role}{role && company ? " · " : ""}{company}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-background p-1 hover:bg-card"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          {flash && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${flash.kind === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              <span className="inline-flex items-center gap-1.5">
                {flash.kind === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {flash.text}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Bullet {idx + 1} of {bullets.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={prev} disabled={idx === 0} className="rounded border border-border bg-card/40 p-1 hover:bg-card disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={next} disabled={idx >= bullets.length - 1} className="rounded border border-border bg-card/40 p-1 hover:bg-card disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <section className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Original</p>
            <p className="text-sm">{current}</p>
          </section>

          <button
            type="button"
            onClick={handleTranslate}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-4 w-4" />}
            {result ? "Re-translate" : "Translate to product-co language"}
          </button>

          {result && (
            <section className="space-y-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-primary">Rewritten</p>
                <p className="text-sm">{result.rewritten}</p>
              </div>
              {result.rationale && (
                <p className="text-[11px] text-muted-foreground italic">{result.rationale}</p>
              )}
              {result.follow_ups.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-amber-300">
                    Sharpen this bullet by answering
                  </p>
                  <ul className="space-y-0.5 text-xs text-amber-200/90">
                    {result.follow_ups.map((q, i) => (
                      <li key={i}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <CheckCircle2 className="h-4 w-4" /> Apply this rewrite
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
