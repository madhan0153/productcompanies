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
          background: "#0f0921",
          borderRadius: 7,
        }}
      >
        {/* P stem + top bar */}
        <div style={{ position: "relative", width: 20, height: 26, display: "flex" }}>
          {/* Vertical stem */}
          <div style={{
            position: "absolute", left: 0, top: 0, width: 5, height: 26,
            borderRadius: 2.5,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Top bar */}
          <div style={{
            position: "absolute", left: 0, top: 0, width: 14, height: 5,
            borderRadius: 2.5,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Middle bar */}
          <div style={{
            position: "absolute", left: 0, top: 10.5, width: 14, height: 5,
            borderRadius: 2.5,
            background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          }} />
          {/* Cyan node */}
          <div style={{
            position: "absolute", right: -2, top: 9.5, width: 7, height: 7,
            borderRadius: "50%",
            background: "#06B6D4",
            boxShadow: "0 0 6px #06B6D4",
          }} />
        </div>
      </div>
    ),
    size,
  );
}
