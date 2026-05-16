// Sprint 4 — Item 25. Apple touch icon (180×180). Next 16 file-based metadata.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          color: "white",
          fontSize: 110,
          fontWeight: 800,
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: -2,
          borderRadius: 38,
        }}
      >
        P
      </div>
    ),
    size,
  );
}
