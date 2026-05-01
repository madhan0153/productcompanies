import { Skeleton, SkeletonCircle } from "@/components/skeleton";

export default function MatchesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading matches">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {[18, 22, 16, 20, 14].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-1 items-start gap-3">
                <SkeletonCircle size={44} />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                  <div className="flex gap-1.5 pt-1">
                    {[1, 2, 3, 4].map((k) => (
                      <Skeleton key={k} className="h-5 w-12 rounded-md" />
                    ))}
                  </div>
                </div>
              </div>
              <SkeletonCircle size={56} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
