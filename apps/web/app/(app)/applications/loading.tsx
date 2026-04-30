export default function ApplicationsLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading applications">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-secondary" />
          <div className="h-4 w-44 rounded bg-secondary" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-secondary" />
      </div>
      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-24 rounded-full bg-secondary" />
        ))}
      </div>
      {/* Application cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
    </div>
  );
}
