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
          background: "#8f5730",
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontFamily: "Georgia, serif",
            color: "#faf7f5",
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size }
  );
}
