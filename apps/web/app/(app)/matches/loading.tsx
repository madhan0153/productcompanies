export default function MatchesLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading matches">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-secondary" />
          <div className="h-4 w-44 rounded bg-secondary" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-secondary" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-secondary" />
        ))}
      </div>
      {/* Match cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
    </div>
  );
}
