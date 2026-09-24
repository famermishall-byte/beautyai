"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("common");
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center">
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-background rounded-t-sheet shadow-sheet max-h-[85vh] flex flex-col animate-sheet-in pb-[env(safe-area-inset-bottom)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mx-auto w-10 h-1.5 rounded-full bg-border-strong mt-3" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border transition hover:bg-state-hover active:scale-90 focus-ring"
          >
            <X className="size-4.5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border bg-card/60">{footer}</div>}
      </div>
    </div>
  );
}
