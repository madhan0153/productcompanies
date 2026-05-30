import { DSA_V2_PATTERNS_DISPLAY } from "@prodmatch/shared";

export type Difficulty = "easy" | "medium" | "hard";
export type Bucket = "pure_dsa" | "ai_applied" | "indian_domain";

export const BUCKET_LABEL: Record<Bucket, string> = {
  pure_dsa: "Pure DSA",
  ai_applied: "AI-applied",
  indian_domain: "Indian domain",
};

export const DIFF_CLASS: Record<Difficulty, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function patternLabel(pattern: string): string {
  return DSA_V2_PATTERNS_DISPLAY[pattern as keyof typeof DSA_V2_PATTERNS_DISPLAY] ?? pattern;
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        className || "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </span>
  );
}

export function DifficultyPill({ d }: { d: Difficulty }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${DIFF_CLASS[d]}`}>{d}</span>
  );
}
