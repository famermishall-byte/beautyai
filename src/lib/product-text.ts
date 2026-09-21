"use client";

import { useLocale } from "next-intl";
import type { Product } from "@/types";

type Texts = { name: string; description: string | null; characteristics: string | null; purpose: string | null };
type ProductLike = Pick<Product, "name" | "description" | "characteristics" | "purpose"> &
  Partial<Pick<Product, "nameKy" | "descriptionKy" | "characteristicsKy" | "purposeKy">>;

/**
 * Text of a product in the given language. Kyrgyz comes from the *_ky columns (products.name_ky, ...);
 * when a value is empty the Russian text is shown. Brand and SKU are never translated, and the Russian fields
 * stay the source for logic (personalisation matches on them) — only what is displayed changes.
 */
export function productText(p: ProductLike, locale: string): Texts {
  if (locale !== "ky") return { name: p.name, description: p.description, characteristics: p.characteristics, purpose: p.purpose };
  return {
    name: p.nameKy || p.name,
    description: p.descriptionKy || p.description,
    characteristics: p.characteristicsKy || p.characteristics,
    purpose: p.purposeKy || p.purpose,
  };
}

/** Hook form: `const text = useProductText(); text(product).name`. */
export function useProductText() {
  const locale = useLocale();
  return (p: ProductLike) => productText(p, locale);
}
