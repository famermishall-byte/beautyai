"use client";

import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

type Variant = "plain" | "surface" | "soft" | "danger";

const VARIANT: Record<Variant, string> = {
  plain: "text-foreground hover:bg-state-hover",
  surface: "bg-card border border-border text-foreground hover:bg-state-hover",
  soft: "bg-accent-soft text-accent hover:bg-accent hover:text-on-accent",
  danger: "text-muted hover:text-error hover:bg-error-soft",
};

/** Round icon-only button. 40px visual, `label` is required (becomes aria-label). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; variant?: Variant; size?: "sm" | "md" }
>(function IconButton({ icon: Icon, label, variant = "plain", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={[
        "shrink-0 inline-flex items-center justify-center rounded-full transition duration-150 active:scale-90 focus-ring disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "w-9 h-9" : "w-10 h-10",
        VARIANT[variant],
        className,
      ].join(" ")}
      {...props}
    >
      <Icon className={size === "sm" ? "size-4" : "size-5"} strokeWidth={2} aria-hidden />
    </button>
  );
});
