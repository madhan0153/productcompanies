import { DSA_V2_PATTERNS_DISPLAY } from "@prodmatch/shared";

export type Difficulty = "easy" | "medium" | "hard";
export type Bucket = "pure_dsa" | "ai_applied" | "indian_domain";

export const BUCKET_LABEL: Record<Bucket, string> = {
  pure_dsa: "Pure DSA",
  ai_applied: "AI-applied",
  indian_domain: "Indian domain",
};

// Difficulty hue carries meaning (green→amber→red), so it maps onto the
// theme-aware semantic tokens rather than fixed palette steps — readable in
// both light and dark.
export const DIFF_CLASS: Record<Difficulty, string> = {
  easy: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  hard: "bg-destructive/10 text-destructive",
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
