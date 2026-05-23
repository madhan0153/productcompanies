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
          background: "#0f0921",
          borderRadius: 38,
        }}
      >
        <div style={{ position: "relative", width: 110, height: 144, display: "flex" }}>
          {/* Vertical stem */}
          <div style={{
            position: "absolute", left: 0, top: 0, width: 28, height: 144,
            borderRadius: 14,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Top bar */}
          <div style={{
            position: "absolute", left: 0, top: 0, width: 80, height: 28,
            borderRadius: 14,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Middle bar */}
          <div style={{
            position: "absolute", left: 0, top: 58, width: 80, height: 28,
            borderRadius: 14,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Bowl arc approximated with a rounded right edge */}
          <div style={{
            position: "absolute", left: 52, top: 0, width: 58, height: 86,
            borderRadius: "0 43px 43px 0",
            border: "28px solid #7C3AED",
            borderLeft: "none",
          }} />
          {/* Cyan glow ring */}
          <div style={{
            position: "absolute", right: -14, top: 58, width: 40, height: 40,
            borderRadius: "50%",
            background: "rgba(6,182,212,0.18)",
          }} />
          {/* Cyan node */}
          <div style={{
            position: "absolute", right: -6, top: 66, width: 24, height: 24,
            borderRadius: "50%",
            background: "#06B6D4",
            boxShadow: "0 0 16px #06B6D4",
          }} />
        </div>
      </div>
    ),
    size,
  );
}
