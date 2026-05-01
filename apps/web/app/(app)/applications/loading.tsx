import { Skeleton, SkeletonCircle } from "@/components/skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading applications">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-start gap-3">
              <SkeletonCircle size={40} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
