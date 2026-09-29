/**
 * Фильтр по категории в «Остатках» и «Рейтинге товаров» (просьба владельца 29.09: товаров много, нужно
 * выбрать, например, «Уход за лицом» и видеть только её). Список категорий не задан заранее — он
 * собирается из самих товаров (products.category), поэтому новый каталог из Excel подхватывается сам.
 * "" — товары без категории.
 */
export const ALL_CATEGORIES = "all";

export type CategoryOption = { name: string; count: number };

const clean = (category: string | null | undefined) => (category ?? "").trim();

export function categoryOptions(items: { category: string | null | undefined }[]): CategoryOption[] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(clean(i.category), (counts.get(clean(i.category)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === "" ? 1 : b.name === "" ? -1 : a.name.localeCompare(b.name, "ru")));
}

export function filterByCategory<T extends { category: string | null | undefined }>(items: T[], category: string): T[] {
  if (category === ALL_CATEGORIES) return items;
  return items.filter((i) => clean(i.category) === category.trim());
}
