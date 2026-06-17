// Route-level loading skeleton for the entire /admin subtree. Next.js renders
// this inside AdminLayout (so .pm-shell tokens apply) while any admin page's
// server queries resolve — replacing the previous blank screen with a
// structure-preserving shimmer that matches the KPI-grid + list shape most
// admin pages use. One file covers every admin route that lacks its own.

import { Card, Skeleton } from "@/components/admin/pm";

export default function AdminLoading() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }} aria-busy="true">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <Skeleton w={120} h={11} radius={4} />
        <Skeleton w={220} h={26} radius={6} style={{ marginTop: 8 }} />
        <Skeleton w={300} h={13} radius={4} style={{ marginTop: 8 }} />
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} p={14}>
            <Skeleton w={80} h={12} radius={4} />
            <Skeleton w={64} h={26} radius={6} style={{ marginTop: 10 }} />
            <Skeleton w="60%" h={11} radius={4} style={{ marginTop: 10 }} />
          </Card>
        ))}
      </div>

      {/* Section + list */}
      <Skeleton w={160} h={14} radius={4} style={{ margin: "26px 0 12px" }} />
      <Card p={0}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              borderBottom: i < 5 ? "1px solid var(--line-2)" : "none",
            }}
          >
            <Skeleton w={32} h={32} radius={8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton w="45%" h={13} radius={4} />
              <Skeleton w="30%" h={11} radius={4} style={{ marginTop: 6 }} />
            </div>
            <Skeleton w={56} h={20} radius={999} />
          </div>
        ))}
      </Card>
    </div>
  );
}
