import { Skeleton, SkeletonCircle } from "@/components/skeleton";

export default function JobLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading job">
      <Skeleton className="h-3 w-44" />

      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex items-start gap-5">
          <SkeletonCircle size={64} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-28" />
          </div>
          <SkeletonCircle size={88} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i % 3 === 0 ? "w-3/4" : "w-full"}`} />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
