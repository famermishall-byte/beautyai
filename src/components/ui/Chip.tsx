"use client";

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
