export default function StoriesLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading story bank">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-secondary" />
          <div className="h-4 w-48 rounded bg-secondary" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-secondary" />
      </div>
      {/* Tag chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-secondary" />
        ))}
      </div>
      {/* Story cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
    </div>
  );
}
