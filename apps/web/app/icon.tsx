import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0921",
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <svg
          width="20"
          height="26"
          viewBox="0 0 20 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical stem */}
          <rect x="0" y="0" width="5" height="26" rx="2.5" fill="#8B5CF6" />
          {/* Top bar */}
          <rect x="0" y="0" width="14" height="5" rx="2.5" fill="#8B5CF6" />
          {/* Middle bar */}
          <rect x="0" y="10" width="14" height="5" rx="2.5" fill="#8B5CF6" />
          {/* Bowl arc */}
          <path
            d="M13 0 Q20 0 20 7.5 Q20 15 13 15"
            stroke="#8B5CF6"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Cyan node */}
          <circle cx="17" cy="12.5" r="3" fill="#06B6D4" />
        </svg>
      </div>
    ),
    size,
  );
}
