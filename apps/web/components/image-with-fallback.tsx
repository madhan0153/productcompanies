"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Rendered in place of the image if the URL fails to load. */
  fallback: ReactNode;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  imgClassName?: string;
};

/**
 * Single, centralized image-with-fallback primitive. Renders an optimized
 * next/image and swaps to `fallback` on load error — so a broken or dead
 * image URL degrades to an intentional placeholder instead of the browser's
 * broken-image glyph. The wrapper keeps fixed dimensions, so a late failure
 * never shifts layout.
 *
 * This is a small client island: server components can render it freely, but
 * only the URL branch ships JS. The common (no-URL) path stays fully server
 * rendered via CompanyLogoFallback.
 */
export function ImageWithFallback({
  src,
  alt,
  width,
  height,
  fallback,
  wrapperClassName,
  wrapperStyle,
  imgClassName,
}: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;

  return (
    <span className={wrapperClassName} style={wrapperStyle}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imgClassName}
        onError={() => setFailed(true)}
        unoptimized
      />
    </span>
  );
}
