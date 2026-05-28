"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAllPending } from "./actions";

type Current = {
  status?: string;
  bucket?: string;
  difficulty?: string;
  pattern?: string;
  role?: string;
  q?: string;
};

const STATUS_OPTIONS = ["", "pending_review", "live", "rejected", "deferred"] as const;
const BUCKET_OPTIONS = ["", "pure_dsa", "ai_applied", "indian_domain"] as const;
const DIFFICULTY_OPTIONS = ["", "easy", "medium", "hard"] as const;

export function QueueFilters({ current }: { current: Current }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(current.q ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else       next.delete(key);
    startTransition(() => router.push(`?${next.toString()}`));
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push("?"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <FilterGroup label="Status" options={STATUS_OPTIONS as readonly string[]} current={current.status ?? ""} onChange={(v) => setParam("status", v)} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <FilterGroup label="Bucket" options={BUCKET_OPTIONS as readonly string[]} current={current.bucket ?? ""} onChange={(v) => setParam("bucket", v)} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <FilterGroup label="Difficulty" options={DIFFICULTY_OPTIONS as readonly string[]} current={current.difficulty ?? ""} onChange={(v) => setParam("difficulty", v)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="search"
          placeholder="Search slug or title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setParam("q", q); }}
          style={{
            flex: 1, maxWidth: 360, minHeight: 38,
            padding: "0 12px", borderRadius: 9,
            border: "1px solid var(--line)", background: "var(--surface)",
            fontSize: 13, color: "var(--text)",
          }}
        />
        <button
          type="button"
          onClick={() => setParam("q", q)}
          style={{
            minHeight: 38, padding: "0 14px", borderRadius: 9,
            background: "var(--accent)", color: "var(--accent-fg, #fff)",
            fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
          }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={clearAll}
          style={{
            minHeight: 38, padding: "0 14px", borderRadius: 9,
            background: "transparent", color: "var(--text-2)",
            border: "1px solid var(--line)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function ApproveAllButton({ pending }: { pending: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    if (pending === 0) return;
    const ok = window.confirm(
      `Approve all ${pending} pending question${pending === 1 ? "" : "s"}? They will go live and become eligible for daily dispatch.`,
    );
    if (!ok) return;
    setMsg(null);
    startTransition(async () => {
      const res = await approveAllPending();
      if (res.ok) {
        setMsg(`Approved ${res.approved} question${res.approved === 1 ? "" : "s"}.`);
        router.refresh();
      } else {
        setMsg(`Error: ${res.error}`);
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={run}
        disabled={isPending || pending === 0}
        style={{
          minHeight: 38, padding: "0 16px", borderRadius: 9,
          background: pending === 0 ? "var(--surface)" : "var(--accent)",
          color: pending === 0 ? "var(--text-3)" : "var(--accent-fg, #fff)",
          border: pending === 0 ? "1px solid var(--line)" : "none",
          fontSize: 13, fontWeight: 600,
          cursor: isPending || pending === 0 ? "default" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Approving…" : `Approve all pending (${pending})`}
      </button>
      {msg && (
        <span style={{ fontSize: 12, color: msg.startsWith("Error") ? "var(--err)" : "var(--ok, var(--accent))" }}>
          {msg}
        </span>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
  onChange,
}: { label: string; options: readonly string[]; current: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--text-3)", marginRight: 4,
      }}>
        {label}
      </span>
      {options.map((opt) => {
        const active = current === opt;
        const label = opt === "" ? "All" : opt.replace(/_/g, " ");
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              minHeight: 32, padding: "0 11px", borderRadius: 999,
              background: active ? "var(--accent-soft)" : "var(--surface)",
              border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
              color:  active ? "var(--accent-strong)" : "var(--text-2)",
              fontSize: 12, fontWeight: active ? 600 : 500,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
