import type { SkinType } from "@/lib/skincare";
import type { Product } from "@/types";

// "Специально для тебя" on the home screen — plain rules, no ML. The catalog
// categories considered are all the skincare ones; which products actually
// surface for a given skin type is decided by matching the product's own
// "для кого подходит" text against the type (see skinFit below).
const CARE_CATEGORIES = ["Очищение", "Тоники", "Сыворотки", "Кремы", "Маски", "SPF", "Уход за глазами"];

export const SKIN_TYPE_CATEGORIES: Record<SkinType, string[]> = {
  dry: CARE_CATEGORIES,
  oily: CARE_CATEGORIES,
  combination: CARE_CATEGORIES,
  normal: CARE_CATEGORIES,
  sensitive: CARE_CATEGORIES,
};

// Word stems for how a product's "для кого" text names each skin type.
const SKIN_STEMS: Record<SkinType, string> = {
  dry: "сух",
  oily: "жирн",
  combination: "комбинир",
  normal: "нормальн",
  sensitive: "чувствител",
};

// Generic fit of a product's "для кого" text to a set of type stems:
// 2 = it names this type, 1 = it names no type at all (universal),
// 0 = it names only other types.
export function fitByStems(purpose: string | null, ownStem: string, allStems: string[]): number {
  const text = (purpose ?? "").toLowerCase();
  if (text.includes(ownStem)) return 2;
  return allStems.some((stem) => text.includes(stem)) ? 0 : 1;
}

export function skinFit(p: Product, type: SkinType): number {
  return fitByStems(p.purpose, SKIN_STEMS[type], Object.values(SKIN_STEMS));
}
