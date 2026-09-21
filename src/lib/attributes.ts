import type { Product } from "@/types";

// Product attributes power the catalog filters and attribute-based collections
// ("Сухие волосы", "Жирные волосы"…). One product can carry several values, so it
// shows up in every matching collection without being duplicated in the database.

export const HAIR_TYPE_LABELS: Record<string, string> = {
  dry: "Сухие",
  oily: "Жирные",
  normal: "Нормальные",
  damaged: "Повреждённые",
  colored: "Окрашенные",
};

export const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: "Сухая",
  oily: "Жирная",
  combination: "Комбинированная",
  normal: "Нормальная",
  sensitive: "Чувствительная",
};

const LEGACY_HAIR_WORDS: Record<string, string> = {
  сухие: "dry",
  жирные: "oily",
  нормальные: "normal",
  повреждённые: "damaged",
  окрашенные: "colored",
};

/** Hair types of a product. Falls back to the "Тип волос: …" text in `purpose` until the attributes column is filled. */
export function hairTypesOf(p: Product): string[] {
  if (p.attributes?.hairType?.length) return p.attributes.hairType;
  const m = p.purpose?.toLowerCase().match(/тип волос:\s*([а-яё]+)/);
  return m && LEGACY_HAIR_WORDS[m[1]] ? [LEGACY_HAIR_WORDS[m[1]]] : [];
}

export function skinTypesOf(p: Product): string[] {
  return p.attributes?.skinType ?? [];
}
