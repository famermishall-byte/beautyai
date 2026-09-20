"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 animate-rise-in">
      <div
        className={[
          "w-16 h-16 rounded-full flex items-center justify-center mb-5",
          tone === "error" ? "bg-error-soft text-error" : "bg-accent-soft text-accent",
        ].join(" ")}
      >
        <Icon className="size-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="font-display text-xl mb-1.5">{title}</h3>
      {description && <p className="text-sm text-muted max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
