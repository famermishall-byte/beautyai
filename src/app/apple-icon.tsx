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
          background: "#c8135f",
        }}
      >
        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          01
        </div>
      </div>
    ),
    { ...size }
  );
}
