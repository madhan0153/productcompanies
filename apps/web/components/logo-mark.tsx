import Image from "next/image";

import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[9px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] ring-1 ring-white/20",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-prodmatchai.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority={size >= 32}
        sizes={`${size}px`}
      />
    </span>
  );
}
