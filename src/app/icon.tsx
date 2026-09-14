import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "#8f5730",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 260,
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
