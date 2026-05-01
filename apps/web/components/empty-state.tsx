"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
};

type Props = {
  icon: React.ReactNode;
  title: string;
  body: string;
  actions?: Action[];
  className?: string;
};

// One illustrated, animated empty state for every "no data yet" surface.
// Uses a halo blur, gradient icon plate, and respects reduced motion.
export function EmptyState({ icon, title, body, actions, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center",
        className,
      )}
    >
      {/* Decorative halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-glow/10 to-transparent text-primary backdrop-blur">
        {icon}
      </div>
      <h3 className="relative font-display text-lg font-semibold">{title}</h3>
      <p className="relative mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {body}
      </p>

      {actions && actions.length > 0 && (
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map((a) => {
            const cls =
              a.variant === "ghost"
                ? "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                : "bg-primary text-primary-foreground shadow shadow-primary/30 hover:opacity-90";
            const className = cn(
              "press inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition focus-ring",
              cls,
            );
            return a.href ? (
              <Link key={a.label} href={a.href} className={className}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={className}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
