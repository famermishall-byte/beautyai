"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "whatsapp";
type Size = "md" | "lg" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-button hover:bg-accent-strong active:scale-[0.97] disabled:bg-accent/40 disabled:shadow-none",
  secondary:
    "bg-accent-soft text-accent-strong hover:bg-accent hover:text-on-accent active:scale-[0.97] disabled:opacity-50",
  ghost:
    "bg-transparent text-foreground border border-border-strong hover:bg-state-hover active:scale-[0.97] disabled:opacity-40",
  danger: "bg-error text-on-accent hover:opacity-90 active:scale-[0.97] disabled:opacity-40",
  success: "bg-success text-on-accent hover:opacity-90 active:scale-[0.97] disabled:opacity-40",
  // The WhatsApp hand-off — the one place a third-party brand color is allowed.
  whatsapp: "bg-whatsapp text-on-accent hover:opacity-90 active:scale-[0.97] disabled:opacity-40",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-full gap-1.5",
  md: "h-12 px-6 text-sm rounded-full gap-2",
  lg: "h-14 px-7 text-base rounded-full gap-2",
};

/** Button styles for things that must be a <Link>/<a> but look like a Button. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: { variant?: Variant; size?: Size; fullWidth?: boolean; className?: string } = {}) {
  return [
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");
}

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
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" strokeWidth={2.25} aria-hidden />}
      {children}
    </button>
  );
});
