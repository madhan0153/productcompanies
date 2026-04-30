export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-secondary" />
          <div className="h-4 w-52 rounded bg-secondary" />
        </div>
        {/* DNA ring placeholder */}
        <div className="h-24 w-24 rounded-full border-4 border-secondary bg-transparent" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card/40" />
        ))}
      </div>
      {/* Pipeline */}
      <div className="h-52 rounded-2xl border border-border bg-card/40" />
      {/* Checklist + recent */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-2xl border border-border bg-card/40" />
        <div className="h-48 rounded-2xl border border-border bg-card/40" />
      </div>
    </div>
  );
}
