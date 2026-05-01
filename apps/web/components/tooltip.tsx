"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  side?: "top" | "bottom";
  children: React.ReactNode;
  className?: string;
};

// Lightweight CSS-only tooltip with keyboard + screen-reader support.
// No Radix / Floating UI dependency — keeps the bundle lean.
export function Tooltip({ label, side = "top", children, className }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      <span aria-describedby={id} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-xs text-foreground shadow-lg backdrop-blur transition",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {label}
      </span>
    </span>
  );
}
