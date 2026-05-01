"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

type Props = {
  companyName: string;
  companyLogoUrl: string | null;
  title: string;
  applyUrl: string | null;
};

// A compact bar that slides in once the user has scrolled past the hero card.
// Keeps the primary action ("Apply") within reach without forcing them back up.
export function StickyApplyBar({ companyName, companyLogoUrl, title, applyUrl }: Props) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const target = document.getElementById("job-hero");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      // Show once the hero is entirely above the viewport
      setVisible(rect.bottom < 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!applyUrl) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: -40, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-30 -mx-6 mb-3 border-b border-border bg-background/85 px-6 py-2.5 backdrop-blur-xl"
          role="region"
          aria-label="Apply"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <CompanyLogo name={companyName} logoUrl={companyLogoUrl} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-xs text-muted-foreground">{companyName}</p>
            </div>
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow shadow-primary/30 transition hover:opacity-90 focus-ring"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
