"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Download } from "lucide-react";

const SENIORITY = ["junior", "mid", "senior", "staff", "principal", "manager", "director"];
const HUBS = [
  "Bengaluru", "Hyderabad", "Pune", "Gurugram",
  "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India",
];

export function InsightsFilters({
  seniority,
  hub,
}: {
  seniority: string | null;
  hub: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: "seniority" | "hub", value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const active = Boolean(seniority || hub);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Slice
      </span>

      <select
        value={seniority ?? ""}
        onChange={(e) => update("seniority", e.target.value || null)}
        className="tap-target-sm rounded-md border border-input bg-background px-2.5 text-xs focus-ring"
        aria-label="Filter by seniority"
      >
        <option value="">Any seniority</option>
        {SENIORITY.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      <select
        value={hub ?? ""}
        onChange={(e) => update("hub", e.target.value || null)}
        className="tap-target-sm rounded-md border border-input bg-background px-2.5 text-xs focus-ring"
        aria-label="Filter by hub"
      >
        <option value="">Any hub</option>
        {HUBS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      {active && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}

      <a
        href="/api/insights/export"
        download
        className="press tap-target-sm ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
      >
        <Download className="h-3 w-3" />
        <span className="hidden sm:inline">Download JSON</span>
        <span className="sm:hidden">JSON</span>
      </a>
    </div>
  );
}
