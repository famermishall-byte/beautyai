"use client";

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center min-h-10 rounded-full px-4 py-2 text-sm font-medium transition duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-strong hover:bg-accent hover:text-on-accent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
