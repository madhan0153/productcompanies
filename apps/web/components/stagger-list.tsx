"use client";

import * as React from "react";
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

  const items = React.Children.toArray(children);

  return (
    <div className={cn(className)}>
      {items.map((child, i) => (
        <motion.div
          key={(child as { key?: string | number })?.key ?? i}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: i * step,
            ease: [0.21, 1.02, 0.49, 1], // Custom springy cubic bezier
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
