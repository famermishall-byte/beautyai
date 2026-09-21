"use client";

import { useLocale, useTranslations } from "next-intl";

/** Formats an amount as "1 250 сом" in the current language (number format + currency word from messages). */
export function usePrice() {
  const locale = useLocale();
  const t = useTranslations("common");
  return (amount: number) => t("price", { amount: amount.toLocaleString(locale) });
}
