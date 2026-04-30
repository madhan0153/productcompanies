export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-secondary" />
          <div className="h-4 w-32 rounded bg-secondary" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-secondary" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border bg-card/40" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
    </div>
  );
}
