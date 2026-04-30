import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  logoUrl: string | null | undefined;
  size?: number;
  className?: string;
};

// Renders a company logo with a graceful initial-letter fallback.
// Uses next/image for the URL form (lazy, optimized) and a CSS gradient
// for the fallback so we never render a broken image icon.
export function CompanyLogo({ name, logoUrl, size = 36, className }: Props) {
  const initial = (name?.[0] ?? "?").toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/20 to-fuchsia-500/10 text-xs font-bold text-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          unoptimized
        />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
