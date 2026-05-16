// Sprint 4 — Item 25. Dynamic PWA / favicon icon (Next 16 file-based).
//
// Renders a 32×32 monogram in the brand gradient. Cached at the edge, no
// binary assets to commit. The same icon is reused for the apple-icon.tsx
// sibling at a larger size.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
          borderRadius: 6,
          color: "white",
          fontSize: 18,
          fontWeight: 800,
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: -0.5,
        }}
      >
        P
      </div>
    ),
    size,
  );
}
