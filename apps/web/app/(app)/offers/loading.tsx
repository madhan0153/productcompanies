export default function OffersLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading offer compare">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-secondary" />
          <div className="h-4 w-52 rounded bg-secondary" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-secondary" />
      </div>
      {/* Bar chart card */}
      <div className="h-48 rounded-2xl border border-border bg-card/40" />
      {/* Table */}
      <div className="h-64 rounded-2xl border border-border bg-card/40" />
    </div>
  );
}
