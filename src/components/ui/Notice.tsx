import { CheckCircle2, Info, TriangleAlert, CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type NoticeTone = "success" | "warning" | "error" | "info" | "accent";

const TONE: Record<NoticeTone, { cls: string; icon: LucideIcon }> = {
  success: { cls: "bg-success-soft text-success", icon: CheckCircle2 },
  warning: { cls: "bg-warning-soft text-warning", icon: TriangleAlert },
  error: { cls: "bg-error-soft text-error", icon: CircleAlert },
  info: { cls: "bg-info-soft text-info", icon: Info },
  accent: { cls: "bg-accent-soft text-accent-strong", icon: Info },
};

/**
 * Inline message block: form errors, success confirmations, warnings.
 * Errors are announced (role="alert"), everything else is polite (role="status").
 */
export function Notice({
  tone = "info",
  icon,
  title,
  className = "",
  children,
}: {
  tone?: NoticeTone;
  icon?: LucideIcon | null;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const Icon = icon === null ? null : (icon ?? TONE[tone].icon);
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={["flex gap-2.5 rounded-control px-4 py-3 text-sm text-left", TONE[tone].cls, className].join(" ")}
    >
      {Icon && <Icon className="size-4.5 shrink-0 mt-px" strokeWidth={2} aria-hidden />}
      <div className="min-w-0 flex-1 leading-snug">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? "mt-0.5 opacity-90" : "font-medium"}>{children}</div>}
      </div>
    </div>
  );
}
