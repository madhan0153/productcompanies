"use client";

/**
 * Tiny CSS-only pattern visualisations for the patterns roadmap.
 *
 * No framer-motion — all animations are pure CSS keyframes so we don't
 * pay a JS cost on this otherwise-static page. Each animation respects
 * `prefers-reduced-motion: reduce` by falling back to a static snapshot.
 */
import type { DsaPattern } from "@prodmatch/shared";

const STYLE = `
@keyframes prodmatch-window-slide {
  0%   { transform: translateX(0); }
  100% { transform: translateX(140px); }
}
@keyframes prodmatch-two-pointer-l {
  0%   { transform: translateX(0); }
  100% { transform: translateX(70px); }
}
@keyframes prodmatch-two-pointer-r {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-70px); }
}
@keyframes prodmatch-bfs-ring {
  0%   { transform: scale(0.4); opacity: 0.95; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes prodmatch-dfs-trace {
  0%   { stroke-dashoffset: 220; }
  100% { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .prodmatch-anim {
    animation: none !important;
  }
}
`;

export function PatternAnimation({ pattern }: { pattern: DsaPattern }) {
  const node = renderFor(pattern);
  if (!node) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-secondary/30 p-3">
      <style>{STYLE}</style>
      {node}
    </div>
  );
}

function renderFor(pattern: DsaPattern): React.ReactNode | null {
  switch (pattern) {
    case "sliding_window":
      return <SlidingWindow />;
    case "two_pointers":
      return <TwoPointers />;
    case "graphs":
      return <BfsRipple />;
    case "trees":
      return <DfsTrace />;
    default:
      return null;
  }
}

function SlidingWindow() {
  // 8 cells of 24px + 8px gaps; window covers 3 cells (~72px) sliding.
  const cells = Array.from({ length: 8 });
  return (
    <div className="space-y-2">
      <div className="relative h-8 w-full max-w-[280px]">
        <div className="flex gap-2">
          {cells.map((_, i) => (
            <div key={i} className="h-8 w-7 rounded-md border border-border bg-background text-center text-[11px] leading-8 text-muted-foreground">
              {i + 1}
            </div>
          ))}
        </div>
        <span
          className="prodmatch-anim pointer-events-none absolute left-0 top-[-2px] h-9 w-[88px] rounded-md border-2 border-primary bg-primary/15"
          style={{ animation: "prodmatch-window-slide 3.2s ease-in-out infinite alternate" }}
          aria-hidden
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Window slides one step at a time, growing / shrinking to stay valid.</p>
    </div>
  );
}

function TwoPointers() {
  const cells = Array.from({ length: 8 });
  return (
    <div className="space-y-2">
      <div className="relative h-10 w-full max-w-[280px]">
        <div className="flex gap-2">
          {cells.map((_, i) => (
            <div key={i} className="h-8 w-7 rounded-md border border-border bg-background text-center text-[11px] leading-8 text-muted-foreground">
              {i + 1}
            </div>
          ))}
        </div>
        <span
          className="prodmatch-anim pointer-events-none absolute left-2 top-9 h-1.5 w-1.5 rounded-full bg-primary"
          style={{ animation: "prodmatch-two-pointer-l 2.6s ease-in-out infinite alternate" }}
          aria-hidden
        />
        <span
          className="prodmatch-anim pointer-events-none absolute right-2 top-9 h-1.5 w-1.5 rounded-full bg-warning"
          style={{ animation: "prodmatch-two-pointer-r 2.6s ease-in-out infinite alternate" }}
          aria-hidden
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Left and right pointers converge with a clear invariant.</p>
    </div>
  );
}

function BfsRipple() {
  return (
    <div className="space-y-2">
      <div className="relative mx-auto h-24 w-24">
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
        {[0, 0.6, 1.2].map((delay) => (
          <span
            key={delay}
            className="prodmatch-anim absolute inset-0 m-auto h-3 w-3 rounded-full border-2 border-primary"
            style={{
              animation: `prodmatch-bfs-ring 1.8s ease-out ${delay}s infinite`,
            }}
            aria-hidden
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">BFS expands outward one layer at a time from the source.</p>
    </div>
  );
}

function DfsTrace() {
  // Simple binary tree, stroked DFS path.
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 240 100" className="w-full max-w-[280px]" aria-hidden>
        {/* Nodes */}
        {[
          [120, 16],
          [70, 50],
          [170, 50],
          [40, 84],
          [100, 84],
          [200, 84],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" className="fill-secondary stroke-border" strokeWidth="1.5" />
        ))}
        {/* Static edges */}
        <g className="stroke-border" fill="none" strokeWidth="1">
          <path d="M120 25 L70 41" />
          <path d="M120 25 L170 41" />
          <path d="M70 59 L40 75" />
          <path d="M70 59 L100 75" />
          <path d="M170 59 L200 75" />
        </g>
        {/* Animated DFS trace overlays edges in pre-order. */}
        <path
          d="M120 25 L70 41 L40 75 M70 41 L100 75 M120 25 L170 41 L200 75"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="220"
          className="prodmatch-anim"
          style={{ animation: "prodmatch-dfs-trace 3.2s ease-in-out infinite" }}
        />
      </svg>
      <p className="text-[11px] text-muted-foreground">DFS goes deep before backtracking — pre-order traversal.</p>
    </div>
  );
}
