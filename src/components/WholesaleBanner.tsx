"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgePercent } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useReservedBlock } from "@/lib/reserved-block";
import { Skeleton } from "@/components/ui/Skeleton";

/** Плашка на главной «Опт от 1 000 $ (≈ N сом) — цены ниже»; только когда опт включён и задан курс. */
export function WholesaleBanner() {
  const t = useTranslations("wholesale");
  const price = usePrice();
  const [info, setInfo] = useState<{ usd: number; som: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reserve = useReservedBlock("wholesale", !loaded ? "loading" : info ? "present" : "absent");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wholesale")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings: { thresholdUsd: number }; thresholdSom: number | null } | null) => {
        if (!cancelled && data?.thresholdSom) setInfo({ usd: data.settings.thresholdUsd, som: data.thresholdSom });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // место под плашку, пока она грузится, — иначе блоки ниже съезжают
  if (!info) return reserve ? <Skeleton className="h-12 rounded-[var(--radius-card)]" /> : null;
  return (
    // Розовая рамка и более насыщенный фон — чтобы плашка выделялась на светло-розовом фоне главной (просьба владельца).
    <div className="promo-sheen rounded-[var(--radius-card)] border-2 border-accent bg-gradient-to-r from-accent/15 to-accent/25 px-4 py-3 text-sm font-semibold text-accent-strong flex items-center gap-2.5 shadow-[var(--shadow-card)]">
      <BadgePercent className="size-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
      {t("homeBanner", { usd: info.usd.toLocaleString("ru-RU"), som: price(info.som) })}
    </div>
  );
}
