"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Delay between consecutive items, in seconds. Default: 0.04 */
  step?: number;
};

// Wraps a vertical list and staggers each direct child's mount animation.
// Cheap, broadly applicable, and respects reduced motion.
export function StaggerList({ children, className, step = 0.04 }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={cn(className)}>
      {items.map((child, i) => (
        <motion.div
          key={(child as { key?: string | number })?.key ?? i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: i * step,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
