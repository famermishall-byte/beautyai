"use client";

import { useTranslations } from "next-intl";
import { Clock, MapPin, Phone, Store } from "lucide-react";
import { mapsUrl } from "@/lib/delivery";
import { whatsappDigits } from "@/lib/whatsapp";

const tel = (phone: string) => `tel:+${whatsappDigits(phone)}`;

/**
 * Как клиент получает заказ: самовывоз — одна строка; доставка — адрес (+ «На карте»), желательное время и телефоны
 * со звонком в одно касание. Один и тот же блок у продавца (по ссылке и в админке) и у курьера.
 */
export function DeliveryInfo({
  method,
  address,
  time,
  customerPhone,
  courierPhone,
  compact = false,
}: {
  method: "pickup" | "delivery";
  address: string | null;
  time: string | null;
  customerPhone: string;
  courierPhone: string | null;
  /** В списке заказов админки — без крупных кнопок. */
  compact?: boolean;
}) {
  const t = useTranslations("delivery");

  if (method === "pickup") {
    return (
      <div className="flex items-center gap-2 text-sm rounded-xl bg-accent-soft text-accent-strong px-3 py-2">
        <Store className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
        <span className="font-medium">{t("pickup")}</span>
      </div>
    );
  }

  const button =
    "rounded-full border border-border bg-card px-3.5 min-h-11 text-sm font-medium inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/60 px-3.5 py-3 flex flex-col gap-2 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-accent-strong">{t("delivery")}</div>
      <div className="flex items-start gap-2">
        <MapPin className="size-4 shrink-0 mt-0.5 text-accent" strokeWidth={1.9} aria-hidden />
        <span className="font-medium leading-snug break-words">{address}</span>
      </div>
      {time && (
        <div className="flex items-start gap-2">
          <Clock className="size-4 shrink-0 mt-0.5 text-accent" strokeWidth={1.9} aria-hidden />
          <span>{time}</span>
        </div>
      )}
      {courierPhone && (
        <div className="flex items-start gap-2">
          <Phone className="size-4 shrink-0 mt-0.5 text-accent" strokeWidth={1.9} aria-hidden />
          <span>
            {t("courierPhone")}: <a href={tel(courierPhone)} className="font-medium underline tabular-nums">{courierPhone}</a>
          </span>
        </div>
      )}
      {!compact && (
        <div className="flex flex-wrap gap-2 mt-1">
          <a href={tel(customerPhone)} className={button}>
            <Phone className="size-4" strokeWidth={1.9} aria-hidden />
            {t("callCustomer")}
          </a>
          {address && (
            <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className={button}>
              <MapPin className="size-4" strokeWidth={1.9} aria-hidden />
              {t("openMap")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
