export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <ellipse cx="36" cy="52" rx="19" ry="25" fill="none" stroke="currentColor" strokeWidth="8.5" />
      <path
        d="M 56 34 L 68 26 L 68 78 M 58 78 L 78 78"
        fill="none"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
