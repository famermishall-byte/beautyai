"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_KEYS } from "@/lib/categories";
import { ALL_CATEGORIES, type CategoryOption } from "@/lib/category-filter";

/**
 * Выбор категории в «Остатках» и «Рейтинге товаров». Варианты приходят из самих товаров
 * (lib/category-filter.ts), известные категории переводятся (messages: categories.*), новые — как есть.
 */
export function CategorySelect({ value, options, onChange }: { value: string; options: CategoryOption[]; onChange: (category: string) => void }) {
  const t = useTranslations("categoryFilter");
  const tcat = useTranslations("categories");
  const label = (name: string) => (name === "" ? t("none") : CATEGORY_KEYS[name] ? tcat(CATEGORY_KEYS[name]) : name);
  const total = options.reduce((sum, o) => sum + o.count, 0);

  return (
    <>
      <label htmlFor="category-filter" className="block text-xs font-medium text-muted mb-1.5">
        {t("label")}
      </label>
      <select
        id="category-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent mb-4"
      >
        <option value={ALL_CATEGORIES}>
          {t("all")}
          {total ? ` · ${total}` : ""}
        </option>
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {label(o.name)} · {o.count}
          </option>
        ))}
      </select>
    </>
  );
}
