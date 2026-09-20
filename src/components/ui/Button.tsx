"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_4px_14px_-4px_rgba(151,14,73,0.55)] hover:bg-accent-strong active:scale-[0.97] disabled:bg-accent/40 disabled:shadow-none",
  secondary:
    "bg-accent-soft text-accent-strong hover:bg-accent hover:text-white active:scale-[0.97] disabled:opacity-50",
  ghost:
    "bg-transparent text-foreground border border-border-strong hover:bg-black/[0.03] active:scale-[0.97] disabled:opacity-40",
  danger:
    "bg-error text-white hover:opacity-90 active:scale-[0.97] disabled:opacity-40",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-full gap-1.5",
  md: "h-12 px-6 text-sm rounded-full gap-2",
  lg: "h-14 px-7 text-base rounded-full gap-2",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" strokeWidth={2.25} aria-hidden />}
      {children}
    </button>
  );
});
