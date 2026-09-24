import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "success" | "warning" | "error" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-state-pressed text-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
  info: "bg-info-soft text-info",
};

/** Small status/label pill. Color always comes with text — never color alone. */
export function Badge({
  tone = "neutral",
  icon: Icon,
  size = "sm",
  className = "",
  children,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  size?: "xs" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap w-fit",
        size === "xs" ? "text-2xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        TONE_CLASSES[tone],
        className,
      ].join(" ")}
    >
      {Icon && <Icon className={size === "xs" ? "size-3" : "size-3.5"} strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  );
}
