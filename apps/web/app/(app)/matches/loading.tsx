// Matches page loading skeleton — shown instantly while the server fetches
// match data. Mirrors the actual page structure so there's no layout shift
// when the real content appears.

import { Skeleton, SkeletonCircle } from "@/components/skeleton";

export default function MatchesLoading() {
  return (
    <div className="space-y-4 pb-6" aria-busy="true" aria-label="Loading matches">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Band strip skeleton */}
      <div className="flex gap-1.5">
        {[60, 48, 54, 36].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Filter chips skeleton */}
      <div className="flex flex-wrap gap-1.5">
        {[44, 56, 48, 40].map((w, i) => (
          <Skeleton key={i} className="h-6 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Match cards skeleton — matches the slim card layout */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card px-3.5 py-3 sm:px-4 sm:py-3.5"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="flex items-center gap-3">
              {/* Score column */}
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <SkeletonCircle size={40} />
                <Skeleton className="h-5 w-11 rounded-md" />
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <Skeleton className="h-5 w-4/5" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
