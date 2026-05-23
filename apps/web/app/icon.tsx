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
          background: "#0a0c1a",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="22" viewBox="0 0 20 22">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="4.5" height="22" rx="2" fill="url(#g)" />
          <rect x="0" y="0" width="12" height="4.5" rx="2" fill="url(#g)" />
          <rect x="0" y="8.5" width="12" height="4.5" rx="2" fill="url(#g)" />
          <path d="M11 0 Q19 0 19 6.5 Q19 13 11 13" stroke="url(#g)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="16.5" cy="10.5" r="2.8" fill="#06b6d4" />
          <circle cx="16.5" cy="10.5" r="4.5" fill="#06b6d4" fillOpacity="0.2" />
        </svg>
      </div>
    ),
    size,
  );
}
