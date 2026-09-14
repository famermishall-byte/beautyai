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
          background: "#c8135f",
          borderRadius: 96,
        }}
      >
        <svg width="260" height="260" viewBox="0 0 100 100">
          <ellipse
            cx="36"
            cy="52"
            rx="19"
            ry="25"
            fill="none"
            stroke="#ffffff"
            strokeWidth="8.5"
          />
          <path
            d="M 56 34 L 68 26 L 68 78 M 58 78 L 78 78"
            fill="none"
            stroke="#ffffff"
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
