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
          background: "#0a0c1a",
          borderRadius: 38,
        }}
      >
        <svg width="108" height="122" viewBox="0 0 108 122">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="25" height="122" rx="12" fill="url(#g)" />
          <rect x="0" y="0" width="66" height="25" rx="12" fill="url(#g)" />
          <rect x="0" y="48" width="66" height="25" rx="12" fill="url(#g)" />
          <path d="M60 0 Q108 0 108 36 Q108 72 60 72" stroke="url(#g)" strokeWidth="25" strokeLinecap="round" fill="none" />
          <circle cx="91" cy="60" r="15" fill="#06b6d4" />
          <circle cx="91" cy="60" r="25" fill="#06b6d4" fillOpacity="0.18" />
        </svg>
      </div>
    ),
    size,
  );
}
