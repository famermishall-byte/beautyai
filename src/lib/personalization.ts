import type { SkinType } from "@/lib/skincare";

// "Специально для тебя" on the home screen — plain rules, no ML. The catalog
// categories considered are all the skincare ones; which products actually
// surface for a given skin type is decided by matching the product's own
// "для кого подходит" text against the type (see skinFit in app/(app)/page.tsx).
const CARE_CATEGORIES = ["Очищение", "Тоники", "Сыворотки", "Кремы", "Маски", "SPF", "Уход за глазами"];

export const SKIN_TYPE_CATEGORIES: Record<SkinType, string[]> = {
  dry: CARE_CATEGORIES,
  oily: CARE_CATEGORIES,
  combination: CARE_CATEGORIES,
  normal: CARE_CATEGORIES,
  sensitive: CARE_CATEGORIES,
};
