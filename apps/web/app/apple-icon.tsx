import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0921",
          borderRadius: 38,
        }}
      >
        <svg
          width="110"
          height="144"
          viewBox="0 0 110 144"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical stem */}
          <rect x="0" y="0" width="28" height="144" rx="14" fill="#8B5CF6" />
          {/* Top bar */}
          <rect x="0" y="0" width="78" height="28" rx="14" fill="#8B5CF6" />
          {/* Middle bar */}
          <rect x="0" y="58" width="78" height="28" rx="14" fill="#8B5CF6" />
          {/* Bowl arc */}
          <path
            d="M72 0 Q110 0 110 43 Q110 86 72 86"
            stroke="#8B5CF6"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          {/* Cyan glow ring */}
          <circle cx="96" cy="72" r="22" fill="#06B6D4" fillOpacity="0.18" />
          {/* Cyan node */}
          <circle cx="96" cy="72" r="13" fill="#06B6D4" />
        </svg>
      </div>
    ),
    size,
  );
}
