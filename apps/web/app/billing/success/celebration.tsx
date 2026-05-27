"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Crown, Rocket } from "lucide-react";

interface Props {
  plan:     "pro" | "career_sprint" | "free";
  /** Lazy-load: caller decides when to fire (we don't auto-fire on mount). */
  active:   boolean;
}

// Confetti — simple, deterministic, no external library. 32 pieces is enough
// to feel celebratory without lagging mobile.
const CONFETTI_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

interface Piece {
  id:    number;
  x:     number;       // -50 .. 150 (% of container width, allows overflow)
  rot:   number;       // initial rotation
  delay: number;       // s
  dur:   number;       // s
  color: string;
  size:  number;       // px
}

const PIECES: Piece[] = Array.from({ length: 32 }, (_, i) => ({
  id:    i,
  x:     Math.random() * 200 - 50,
  rot:   Math.random() * 360,
  delay: Math.random() * 0.3,
  dur:   1.2 + Math.random() * 1.4,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size:  6 + Math.random() * 6,
}));

export function CelebrationOverlay({ plan, active }: Props) {
  const reduce = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!active || reduce) return;
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, [active, reduce]);

  const planName = plan === "career_sprint" ? "Career Sprint" : "Pro";
  const Icon     = plan === "career_sprint" ? Rocket : Crown;
  const colour   = plan === "career_sprint" ? "from-violet-500 to-fuchsia-500" : "from-indigo-500 to-violet-500";

  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Confetti layer */}
      {showConfetti && (
        <div className="pointer-events-none absolute -inset-x-32 -top-4 h-[260px] overflow-hidden">
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: `${p.x}%`, y: -10, rotate: p.rot, opacity: 0 }}
              animate={{ y: 260, rotate: p.rot + 540, opacity: [0, 1, 1, 0] }}
              transition={{ duration: p.dur, delay: p.delay, ease: [0.32, 0.72, 0.5, 1] as const }}
              className="absolute left-1/2 block rounded-sm"
              style={{
                width:           `${p.size}px`,
                height:          `${p.size * 0.4}px`,
                backgroundColor: p.color,
              }}
              aria-hidden
            />
          ))}
        </div>
      )}

      {/* Crown / Rocket badge with pulsing halo */}
      <div className="relative mb-5">
        <motion.div
          initial={reduce ? false : { scale: 0.5, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.05 }}
          className={`relative z-10 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${colour} shadow-pop`}
        >
          <Icon className="h-9 w-9 text-white drop-shadow-lg" strokeWidth={2.5} />
        </motion.div>
        {!reduce && (
          <>
            <motion.span
              className={`absolute inset-0 -z-0 rounded-2xl bg-gradient-to-br ${colour} opacity-50`}
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.4, repeat: 2, ease: "easeOut" }}
              aria-hidden
            />
            <motion.span
              className="absolute -right-2 -top-2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.4 }}
            >
              <Sparkles className="h-5 w-5 text-amber-400 drop-shadow" />
            </motion.span>
          </>
        )}
      </div>

      {/* Headline */}
      <motion.h1
        initial={reduce ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Congratulations!
      </motion.h1>
      <motion.p
        initial={reduce ? false : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-2 text-base font-medium"
      >
        You're now a{" "}
        <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text font-bold text-transparent">
          {planName}
        </span>{" "}
        member 🎉
      </motion.p>
      <motion.p
        initial={reduce ? false : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-1 text-sm text-muted-foreground"
      >
        {plan === "career_sprint"
          ? "Priority queue is now yours. Time to sprint."
          : "Unlimited tailoring unlocked. Let's land that offer."}
      </motion.p>
    </div>
  );
}
