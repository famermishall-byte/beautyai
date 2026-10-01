"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, MessageCircle, TriangleAlert } from "lucide-react";
import { desktopWhatsAppUrls, isMobileUserAgent } from "@/lib/whatsapp";

export type SentOrder = { orderNumber: string; whatsappUrl: string };

const greenButton =
  "w-full rounded-full bg-[#25D366] text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex items-center justify-center gap-2 mb-3";

/**
 * «Заказ отправлен» внутри шторки корзины. wa.me только ОТКРЫВАЕТ чат с готовым текстом — отправить
 * должен сам клиент, поэтому предупреждение и кнопка «Открыть WhatsApp снова» (жалоба владельца 24.09).
 * На компьютере — сразу приложение WhatsApp и запасной WhatsApp Web, минуя страницу wa.me (жалоба 01.10).
 */
export function CartOrderSent({ order }: { order: SentOrder }) {
  const t = useTranslations("checkout");
  // userAgent есть только в браузере — до него показываем обычную ссылку wa.me
  const [desktop, setDesktop] = useState<{ app: string; web: string } | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => setDesktop(isMobileUserAgent(navigator.userAgent) ? null : desktopWhatsAppUrls(order.whatsappUrl)));
  }, [order.whatsappUrl]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">💚</div>
      <h3 className="font-display text-2xl mb-3">{t("sentTitle")}</h3>
      <p className="text-muted mb-2">
        {t.rich("sentText", { number: order.orderNumber, b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
      </p>
      <p className="text-muted mb-6">{t("sentHint")}</p>

      <div className="w-full rounded-[var(--radius-card)] bg-warning-soft text-warning px-4 py-3.5 mb-4 text-left flex gap-3">
        <TriangleAlert className="size-5 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
        <p className="text-sm font-medium leading-snug">{t("sentWhatsappWarning")}</p>
      </div>

      {/* обычные ссылки, не window.open — их браузеры не блокируют */}
      {desktop ? (
        <>
          <a href={desktop.app} className={greenButton}>
            <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
            {t("openWhatsappApp")}
          </a>
          <a
            href={desktop.web}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full border border-[#25D366] text-[#128C7E] px-6 py-3 font-medium transition hover:bg-[#25D366]/10 flex items-center justify-center gap-2 mb-3"
          >
            <Globe className="size-4.5" strokeWidth={2} aria-hidden />
            {t("openWhatsappWeb")}
          </a>
        </>
      ) : (
        <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer" className={greenButton}>
          <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
          {t("reopenWhatsapp")}
        </a>
      )}
      {/* Кнопки «Готово» нет по просьбе владельца 29.09 — вернуть, когда появится онлайн-оплата. Закрыть — крестиком в шапке. */}
    </div>
  );
}
