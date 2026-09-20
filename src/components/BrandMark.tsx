import Image from "next/image";

export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/brand/mark.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: size * 0.28 }}
    />
  );
}
