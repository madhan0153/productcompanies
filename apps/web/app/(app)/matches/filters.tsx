"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

type FilterState = {
  companies: string[]; // company slugs
  hubs: string[];
  minScore: number | null;
};

type Props = {
  allCompanies: { slug: string; name: string }[];
  allHubs: string[];
  totalCount: number;
  filteredCount: number;
};

const SCORE_OPTIONS = [
  { v: null as number | null, label: "Any" },
  { v: 75, label: "75+ Strong" },
  { v: 55, label: "55+ Good" },
];

// URL state lives in `c` (companies, csv), `h` (hubs, csv), `min_score` (number).
// Filters compose: pick Hyderabad + Razorpay + 75+ all at once.
export function MatchFilters({ allCompanies, allHubs, totalCount, filteredCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const state: FilterState = useMemo(() => ({
    companies: (params.get("c") ?? "").split(",").filter(Boolean),
    hubs: (params.get("h") ?? "").split(",").filter(Boolean),
    minScore: params.get("min_score") ? parseInt(params.get("min_score")!, 10) : null,
  }), [params]);

  const apply = (next: FilterState) => {
    const sp = new URLSearchParams();
    if (next.companies.length) sp.set("c", next.companies.join(","));
    if (next.hubs.length) sp.set("h", next.hubs.join(","));
    if (next.minScore !== null) sp.set("min_score", String(next.minScore));
    const qs = sp.toString();
    start(() => router.push(qs ? `/matches?${qs}` : "/matches"));
  };

  const toggle = <K extends "companies" | "hubs">(key: K, value: string) => {
    const list = state[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    apply({ ...state, [key]: next });
  };

  const setScore = (v: number | null) => apply({ ...state, minScore: v });
  const clearAll = () => apply({ companies: [], hubs: [], minScore: null });

  const activeCount = state.companies.length + state.hubs.length + (state.minScore !== null ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-medium transition hover:border-primary/40"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">{activeCount}</span>
          )}
        </button>

        {/* Quick score chips */}
        {SCORE_OPTIONS.map((s) => (
          <button
            key={String(s.v)}
            type="button"
            onClick={() => setScore(s.v)}
            disabled={pending}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              state.minScore === s.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filteredCount} of {totalCount}
        </span>
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-4">
          {allCompanies.length > 0 && (
            <FilterGroup title="Company">
              {allCompanies.map((c) => (
                <Chip
                  key={c.slug}
                  active={state.companies.includes(c.slug)}
                  onClick={() => toggle("companies", c.slug)}
                  label={c.name}
                />
              ))}
            </FilterGroup>
          )}
          {allHubs.length > 0 && (
            <FilterGroup title="Location">
              {allHubs.map((h) => (
                <Chip
                  key={h}
                  active={state.hubs.includes(h)}
                  onClick={() => toggle("hubs", h)}
                  label={h}
                />
              ))}
            </FilterGroup>
          )}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
