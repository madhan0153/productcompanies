import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Shimmering loader bar. Uses the .skeleton utility from globals.css.
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("skeleton rounded-md", className)} style={style} aria-hidden />;
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("skeleton rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
