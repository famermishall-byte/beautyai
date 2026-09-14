export function BrandMark({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="33" fill="none" stroke={color} strokeWidth="9" />
      <path
        d="M 37 35 L 50 20 L 50 80"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
