// Readiness meter — 4 mini progress bars with score + grade letter.
// Used by /lab landing AND /lab/readiness results page.
// Server-component-compatible (no client hooks). Pure presentational.

import { Brain, Layers, BookOpen, Wrench } from "lucide-react";

interface Props {
  dsa: number;
  systemDesign: number;
  behavioral: number;
  domain: number;
}

export function ReadinessMeter({ dsa, systemDesign, behavioral, domain }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Score icon={<Brain className="h-4 w-4" />} label="DSA" value={dsa} hint="Data structures & algorithms" />
      <Score icon={<Layers className="h-4 w-4" />} label="System Design" value={systemDesign} hint="Scalable systems trade-offs" />
      <Score icon={<BookOpen className="h-4 w-4" />} label="Behavioral" value={behavioral} hint="STAR stories + soft signals" />
      <Score icon={<Wrench className="h-4 w-4" />} label="Domain" value={domain} hint="Tech stack vs target role" />
    </div>
  );
}

function Score({ icon, label, value, hint }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  const grade = toGrade(value);
  const tone = toneFor(value);
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[10px] text-muted-foreground">{hint}</p>
          </div>
        </div>
        <div className={`shrink-0 rounded-lg border px-2 py-1 text-center ${tone.badge}`}>
          <p className="text-base font-bold leading-none tabular-nums">{grade}</p>
          <p className="text-[10px] leading-none opacity-80">{value}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/50">
        <div className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${tone.bar}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function toGrade(v: number): string {
  if (v >= 90) return "A+";
  if (v >= 80) return "A";
  if (v >= 70) return "B";
  if (v >= 55) return "C";
  return "D";
}

function toneFor(v: number): { bar: string; iconBg: string; badge: string } {
  if (v >= 80) {
    return {
      bar: "bg-emerald-500/70",
      iconBg: "bg-emerald-500/15 text-emerald-400",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    };
  }
  if (v >= 70) {
    return {
      bar: "bg-sky-500/70",
      iconBg: "bg-sky-500/15 text-sky-400",
      badge: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    };
  }
  if (v >= 55) {
    return {
      bar: "bg-amber-500/70",
      iconBg: "bg-amber-500/15 text-amber-400",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    };
  }
  return {
    bar: "bg-rose-500/70",
    iconBg: "bg-rose-500/15 text-rose-400",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  };
}
