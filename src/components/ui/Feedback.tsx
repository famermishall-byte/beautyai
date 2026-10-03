"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TAP_TARGETS, tapFeedback } from "@/lib/haptics";

/** Сколько держится «Отменить» после удаления (просьба владельца 03.10). */
export const UNDO_MS = 5000;

type UndoOffer = {
  /** Что произошло: «Товар удалён из корзины». */
  message: string;
  /** Нажали «Отменить». */
  onUndo: () => void;
  /** Время вышло (или пришло следующее удаление, или экран закрыли) — отменить уже нельзя. */
  onExpire?: () => void;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  /** Подпись опасной кнопки; по умолчанию «Удалить». */
  confirmLabel?: string;
};

type FeedbackValue = {
  /** Полоска снизу «… Отменить» на UNDO_MS. Одновременно одна: следующая закрывает предыдущую. */
  offerUndo: (offer: UndoOffer) => void;
  /** Вопрос «Удалить / Отменить» в стиле приложения вместо системного окна браузера. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [offer, setOffer] = useState<(UndoOffer & { key: number }) | null>(null);
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const current = useRef<UndoOffer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const expire = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const done = current.current;
    current.current = null;
    done?.onExpire?.();
  }, []);

  const offerUndo = useCallback(
    (next: UndoOffer) => {
      expire();
      current.current = next;
      setOffer({ ...next, key: ++counter.current });
      timer.current = setTimeout(() => {
        expire();
        setOffer(null);
      }, UNDO_MS);
    },
    [expire]
  );

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const done = current.current;
    current.current = null;
    setOffer(null);
    done?.onUndo();
  }, []);

  // Экран закрывают или приложение сворачивают — отложенное удаление доводится до конца.
  useEffect(() => {
    window.addEventListener("pagehide", expire);
    return () => {
      window.removeEventListener("pagehide", expire);
      expire();
    };
  }, [expire]);

  // Отклик на нажатие: лёгкая вибрация на любой кнопке приложения (lib/haptics.ts).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest(TAP_TARGETS) : null;
      if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
      tapFeedback();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setAsk({ ...options, resolve })), []);
  const answer = (ok: boolean) => {
    ask?.resolve(ok);
    setAsk(null);
  };

  const value = useMemo(() => ({ offerUndo, confirm }), [offerUndo, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* регион живёт всегда, чтобы экранные дикторы озвучивали появление полоски */}
      <div
        aria-live="polite"
        className="fixed inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
        style={{ bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        {offer && (
          <div
            key={offer.key}
            className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[var(--radius-control)] bg-foreground text-white shadow-[var(--shadow-float)] flex items-center gap-3 pl-4 pr-1.5 py-1.5 animate-rise-in"
          >
            <span className="flex-1 min-w-0 text-sm">{offer.message}</span>
            <button
              type="button"
              onClick={undo}
              className="shrink-0 inline-flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold text-accent-soft transition hover:bg-white/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
            >
              <Undo2 className="size-4" strokeWidth={2} aria-hidden />
              {t("undo")}
            </button>
            <span className="undo-countdown absolute inset-x-0 bottom-0 h-0.5 bg-accent-soft/70 origin-left" style={{ animationDuration: `${UNDO_MS}ms` }} aria-hidden />
          </div>
        )}
      </div>

      {ask && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => answer(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onKeyDown={(e) => e.key === "Escape" && answer(false)}
            className="relative w-full max-w-xs rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-sheet)] animate-rise-in"
          >
            <h2 id="confirm-title" className="font-display text-lg leading-snug">
              {ask.title}
            </h2>
            {ask.description && <p className="text-sm text-muted mt-1.5 leading-relaxed">{ask.description}</p>}
            <div className="flex gap-2 mt-5">
              <Button type="button" variant="ghost" className="flex-1" autoFocus onClick={() => answer(false)}>
                {t("cancel")}
              </Button>
              <Button type="button" variant="danger" className="flex-1" onClick={() => answer(true)}>
                {ask.confirmLabel ?? t("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback должен использоваться внутри FeedbackProvider");
  return context;
}
