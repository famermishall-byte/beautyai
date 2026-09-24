import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Page title block for every inner screen (customer and admin):
 * optional icon chip + font-display title + muted subtitle + optional trailing action.
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  className = "mb-6",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex items-center gap-3.5", className].join(" ")}>
      {Icon && (
        <span className="flex items-center justify-center w-11 h-11 rounded-full bg-accent-soft text-accent shrink-0">
          <Icon className="size-5" strokeWidth={1.85} aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={["font-display leading-tight text-balance", Icon ? "text-2xl" : "text-3xl"].join(" ")}>{title}</h1>
        {subtitle && <p className={["text-muted text-sm", Icon ? "mt-0.5" : "mt-1.5"].join(" ")}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
