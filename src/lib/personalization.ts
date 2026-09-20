import type { SkinType } from "@/lib/skincare";

// "Подобрано для вас" on the home screen — a plain lookup from skin type to
// the catalog categories most relevant to it, no ML/AI involved (same spirit
// as the rule-based routines in skincare.ts).
export const SKIN_TYPE_CATEGORIES: Record<SkinType, string[]> = {
  dry: ["Кремы", "Сыворотки", "Маски"],
  oily: ["Тоники", "Очищение", "Сыворотки"],
  combination: ["Тоники", "Сыворотки", "Кремы"],
  normal: ["Сыворотки", "Кремы", "SPF"],
  sensitive: ["Очищение", "Кремы", "Маски"],
};
