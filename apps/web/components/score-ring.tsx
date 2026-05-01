"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: number; r: number; sw: number; fs: number; sub: string }> = {
  sm: { box: 48, r: 19, sw: 4.5, fs: 12, sub: "text-[10px]" },
  md: { box: 64, r: 26, sw: 5.5, fs: 16, sub: "text-xs" },
  lg: { box: 88, r: 36, sw: 7,   fs: 22, sub: "text-xs" },
};

type Props = {
  score: number;
  size?: Size;
  showLabel?: boolean;
  className?: string;
};

// Unified score ring with 3 size variants. Animates the dash from 0 to score
// on mount (CSS keyframe) so every ring on the page feels deliberate.
// Score-banded color: emerald 75+, amber 55+, neutral otherwise.
export function ScoreRing({ score, size = "md", showLabel = true, className }: Props) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const dim = SIZES[size];
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const circ = 2 * Math.PI * dim.r;
  const offset = circ - (clamped / 100) * circ;

  const tone =
    clamped >= 75 ? { stroke: "stroke-emerald-400", text: "text-emerald-400" } :
    clamped >= 55 ? { stroke: "stroke-amber-400",   text: "text-amber-400" } :
                    { stroke: "stroke-muted-foreground", text: "text-muted-foreground" };

  return (
    <div className={cn("flex shrink-0 flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: dim.box, height: dim.box }}>
        {/* Faint glow halo for high scores */}
        {clamped >= 75 && (
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-emerald-400/15 blur-xl"
          />
        )}
        <svg
          width={dim.box}
          height={dim.box}
          viewBox={`0 0 ${dim.box} ${dim.box}`}
          className="-rotate-90"
          role="img"
          aria-label={`Match score ${clamped} out of 100`}
        >
          <circle
            cx={dim.box / 2}
            cy={dim.box / 2}
            r={dim.r}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={dim.sw}
          />
          <circle
            cx={dim.box / 2}
            cy={dim.box / 2}
            r={dim.r}
            fill="none"
            className={cn(tone.stroke, "transition-all")}
            strokeWidth={dim.sw}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={mounted || reduce ? offset : circ}
            style={{
              transition: reduce ? "none" : "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
        <div
          className={cn("absolute inset-0 flex items-center justify-center font-bold tabular-nums", tone.text)}
          style={{ fontSize: dim.fs }}
        >
          {clamped}
        </div>
      </div>
      {showLabel && (
        <span className={cn("font-medium text-muted-foreground", dim.sub)}>/ 100</span>
      )}
    </div>
  );
}
