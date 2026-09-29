"use client";

import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import type { WholesaleSummary } from "@/lib/wholesale";

/** Полоска опта в корзине: сколько осталось до оптовых цен, а после порога — сколько клиент экономит. */
export function WholesaleProgress({ summary }: { summary: WholesaleSummary }) {
  const t = useTranslations("wholesale");
  const price = usePrice();
  if (summary.threshold === null) return null;

  if (summary.qualifies) {
    // Порог набран, но у отмеченных товаров нет оптовой цены (или акция дешевле) — «экономите 0 сом» не показываем.
    if (!summary.applied) return null;
    return (
      <div className="promo-sheen rounded-xl bg-success-soft text-success text-sm font-medium px-4 py-3 flex items-center gap-2">
        <BadgePercent className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
        {t("applied", { amount: price(summary.savings) })}
      </div>
    );
  }

  const share = Math.min(100, Math.round((summary.retailTotal / summary.threshold) * 100));
  return (
    <div className="promo-sheen rounded-xl bg-accent-soft px-4 py-3">
      <div className="text-sm mb-2">{t("progress", { amount: price(summary.remaining) })}</div>
      {summary.wholesaleTotal < summary.retailTotal && (
        <div className="text-xs font-semibold text-accent-strong mb-2">
          {t("wouldCost", { wholesale: price(summary.wholesaleTotal), retail: price(summary.retailTotal) })}
        </div>
      )}
      <div
        className="h-2 rounded-full bg-white overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
