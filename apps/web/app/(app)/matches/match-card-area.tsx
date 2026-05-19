"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMatchNav } from "./match-transition-context";

const QUOTES = [
  { text: "The best product engineers understand the business before they write the code.", tag: "Product mindset" },
  { text: "India's top 18 product companies hire for impact, not just experience.", tag: "Hiring signal" },
  { text: "A 75+ match means the JD reads like your next career chapter.", tag: "Score guide" },
  { text: "Every role here is sourced directly from official career pages — no stale data.", tag: "Data quality" },
  { text: "Senior engineers at product companies solve scale problems. Junior ones learn to think at scale.", tag: "Career growth" },
  { text: "The gap between ₹30L and ₹60L is usually one well-matched role change.", tag: "Compensation truth" },
];

export function MatchCardArea({ children }: { children: React.ReactNode }) {
  const { navPending } = useMatchNav();
  const reduce = useReducedMotion();
  const [qi, setQi] = useState(0);

  useEffect(() => {
    if (!navPending) return;
    // Advance to a fresh quote on each tab switch
    setQi((i) => (i + 1) % QUOTES.length);
    const t = setInterval(() => setQi((i) => (i + 1) % QUOTES.length), 2800);
    return () => clearInterval(t);
  }, [navPending]);

  return (
    <AnimatePresence mode="wait">
      {navPending ? (
        <motion.div
          key="loading"
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? {} : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-[340px] flex-col items-center justify-center px-6 py-14 text-center sm:py-20"
        >
          {reduce ? (
            <p className="text-sm text-muted-foreground">Loading matches…</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={qi}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-sm"
              >
                <p className="text-xl font-semibold leading-relaxed tracking-tight text-foreground sm:text-2xl">
                  {QUOTES[qi]!.text}
                </p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-primary/60">
                  {QUOTES[qi]!.tag}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Loading your matches…</span>
          </div>

          {/* Progress dots */}
          <div className="mt-4 flex gap-1.5">
            {QUOTES.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === qi % QUOTES.length ? "w-4 bg-primary" : "w-1 bg-primary/20"
                }`}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
