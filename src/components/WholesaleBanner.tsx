"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
import { usePrice } from "@/lib/use-price";

/** Плашка на главной «Опт от 1 000 $ (≈ N сом) — цены ниже»; только когда опт включён и задан курс. */
export function WholesaleBanner() {
  const t = useTranslations("wholesale");
  const price = usePrice();
  const [info, setInfo] = useState<{ usd: number; som: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wholesale")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings: { thresholdUsd: number }; thresholdSom: number | null } | null) => {
        if (!cancelled && data?.thresholdSom) setInfo({ usd: data.settings.thresholdUsd, som: data.thresholdSom });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;
  return (
    <div className="promo-sheen rounded-[var(--radius-card)] bg-accent-soft px-4 py-3 text-sm font-medium flex items-center gap-2.5">
      <BadgePercent className="size-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
      {t("homeBanner", { usd: info.usd.toLocaleString("ru-RU"), som: price(info.som) })}
    </div>
  );
}
