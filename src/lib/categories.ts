// The flat list of product categories, as stored on products.category.
export const CATEGORIES = [
  "Уход за лицом",
  "Очищение",
  "Тоники",
  "Сыворотки",
  "Кремы",
  "SPF",
  "Маски",
  "Уход за глазами",
  "Макияж",
  "Уход за волосами",
];

export type CategoryGroup = {
  name: string;
  emoji: string;
  /** Sub-categories shown as chips once this group is picked. Empty means the tile goes straight to the filtered catalog. */
  children: string[];
};

// A navigation layer on top of the flat category list above — grouping is
// purely presentational (home-screen tiles → catalog chips), so it doesn't
// touch products.category or the import pipeline.
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Уход за лицом",
    emoji: "🧴",
    children: ["Очищение", "Тоники", "Сыворотки", "Кремы", "SPF", "Маски", "Уход за глазами"],
  },
  { name: "Макияж", emoji: "💄", children: [] },
  { name: "Уход за волосами", emoji: "💇‍♀️", children: [] },
];
