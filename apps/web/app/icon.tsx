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
        <svg width="25" height="25" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="teal" x1="7" y1="5" x2="24" y2="24">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
            <linearGradient id="gold" x1="14" y1="25" x2="27" y2="14">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
          </defs>
          <path d="M9 23.5V9.8C9 7.7 10.7 6 12.8 6h5.4C22 6 25 8.8 25 12.4s-3 6.4-6.8 6.4H13" stroke="url(#teal)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M13.5 22.2l3.5 3.2 7.4-8.4" stroke="url(#gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="24.5" cy="16.8" r="2.3" fill="#FDE68A" fillOpacity="0.22" />
        </svg>
      </div>
    ),
    size,
  );
}
