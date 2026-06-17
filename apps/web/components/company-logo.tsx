import { cn } from "@/lib/utils";
import { ImageWithFallback } from "./image-with-fallback";

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: number;
  /** Tailwind radius class. Use "rounded-full" for avatar contexts. */
  rounded?: string;
  className?: string;
};

// Eight theme-aware tints from Tailwind's built-in palette (no new tokens, no
// new deps). A company's name deterministically maps to one tint, so the same
// brand always renders the same colour across the app. Each pair is tuned for
// AA contrast in both light and dark themes.
const TINTS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
] as const;

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * Professional initial-avatar fallback. A single brand initial inside a
 * softly-rounded, deterministically-tinted tile — intentional, not a stray
 * "alphabet box". Decorative: every caller renders the company name as text
 * next to it, so this is `aria-hidden` to avoid a redundant screen-reader read.
 */
export function CompanyLogoFallback({
  name,
  size = 36,
  rounded = "rounded-lg",
  className,
}: Omit<Props, "logoUrl">) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-semibold leading-none",
        rounded,
        tintFor(name ?? ""),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}

/**
 * Company logo with one centralized fallback strategy:
 *   • no URL  → server-rendered tinted initial avatar (no client JS)
 *   • has URL → optimized image that degrades to the same avatar on error
 * Fixed dimensions in both branches prevent layout shift.
 */
export function CompanyLogo({ name, logoUrl, size = 36, rounded = "rounded-lg", className }: Props) {
  const fallback = (
    <CompanyLogoFallback name={name} size={size} rounded={rounded} className={className} />
  );
  if (!logoUrl) return fallback;

  return (
    <ImageWithFallback
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      fallback={fallback}
      wrapperClassName={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-card",
        rounded,
        className,
      )}
      wrapperStyle={{ width: size, height: size }}
      imgClassName="h-full w-full object-contain p-1"
    />
  );
}
