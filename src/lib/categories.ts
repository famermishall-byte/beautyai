import {
  Baby,
  Brush,
  Droplet,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Hand,
  Heart,
  House,
  PersonStanding,
  Scissors,
  Shirt,
  ShieldCheck,
  Smile,
  Sun,
  SprayCan,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";

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
  "Уход для тела",
  "Массажеры",
  "Макияж",
  "Уход за волосами",
  "Шампуни",
  "Кондиционеры",
  "Маски для волос",
];

/** A second-level choice inside a group (e.g. "СПФ" inside "Уход за кожей"). */
export type CategorySection = {
  label: string;
  icon: LucideIcon;
  /** products.category values this section covers. */
  categories: string[];
  /** Optional attribute filter: a product must mention one of these (in purpose / characteristics / name), e.g. "тип волос: сухие". */
  keywords?: string[];
};

export type CategoryGroup = {
  /** Identifier used in the URL (?group=...) — also the products.category to filter by when `children` is empty. */
  name: string;
  /** Tile caption on the search screen, when it differs from `name`. */
  label?: string;
  icon: LucideIcon;
  /** Sub-categories shown as chips once this group is picked. Empty means the tile goes straight to the filtered catalog. */
  children: string[];
  /** When set, picking the group first opens a menu of these sections (+ "Хит продаж"). */
  sections?: CategorySection[];
};

// A navigation layer on top of the flat category list above — grouping is
// purely presentational (search-screen tiles → catalog chips), so it doesn't
// touch products.category or the import pipeline.
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Уход за кожей",
    icon: Droplet,
    children: [
      "Уход за лицом",
      "Очищение",
      "Тоники",
      "Сыворотки",
      "Кремы",
      "SPF",
      "Маски",
      "Уход за глазами",
      "Уход для тела",
      "Массажеры",
    ],
    sections: [
      {
        label: "Уход для лица",
        icon: Smile,
        categories: ["Уход за лицом", "Очищение", "Тоники", "Сыворотки", "Кремы", "Маски", "Уход за глазами"],
      },
      { label: "Уход для тела", icon: PersonStanding, categories: ["Уход для тела"] },
      { label: "СПФ", icon: Sun, categories: ["SPF"] },
      { label: "Массажеры", icon: Hand, categories: ["Массажеры"] },
      { label: "Кремы", icon: Droplet, categories: ["Кремы"] },
      { label: "Сыворотки", icon: FlaskConical, categories: ["Сыворотки"] },
      { label: "Маски для лица", icon: Smile, categories: ["Маски"] },
    ],
  },
  { name: "Макияж", icon: Brush, children: [] },
  { name: "Парфюм", icon: SprayCan, children: [] },
  {
    name: "Уход за волосами",
    label: "Волосы",
    icon: Scissors,
    children: ["Уход за волосами", "Шампуни", "Кондиционеры", "Маски для волос"],
    sections: [
      { label: "Шампуни", icon: Droplets, categories: ["Шампуни"] },
      { label: "Кондиционеры", icon: Wind, categories: ["Кондиционеры"] },
      { label: "Маски для волос", icon: Sparkles, categories: ["Маски для волос"] },
      {
        label: "Для сухих волос",
        icon: Sun,
        categories: ["Уход за волосами", "Шампуни", "Кондиционеры", "Маски для волос"],
        keywords: ["тип волос: сухие"],
      },
      {
        label: "Для жирных волос",
        icon: Droplet,
        categories: ["Уход за волосами", "Шампуни", "Кондиционеры", "Маски для волос"],
        keywords: ["тип волос: жирные"],
      },
    ],
  },
  { name: "Аптечная косметика", icon: FlaskConical, children: [] },
  { name: "Личная гигиена", icon: ShieldCheck, children: [] },
  { name: "Нижнее бельё", icon: Heart, children: [] },
  { name: "Мыломоющие средства", icon: Droplets, children: [] },
  { name: "Для дома", icon: House, children: [] },
  { name: "Для детей", icon: Baby, children: [] },
  { name: "Аксессуары", icon: Gem, children: [] },
  { name: "Мерч", icon: Shirt, children: [] },
  { name: "Подарки", icon: Gift, children: [] },
];

/** The products.category values a group (or one of its sections) covers, as a comma-list for /api/products. */
export function groupCategoryFilter(group: CategoryGroup, sectionLabel?: string | null): string {
  const section = sectionLabel ? group.sections?.find((s) => s.label === sectionLabel) : undefined;
  if (section) return section.categories.join(",");
  return group.children.length > 0 ? group.children.join(",") : group.name;
}
