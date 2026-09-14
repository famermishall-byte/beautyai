import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/BrandMark";

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
        <BrandMark size={260} color="#ffffff" />
      </div>
    ),
    { ...size }
  );
}
