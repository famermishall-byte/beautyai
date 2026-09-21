import {
  Baby,
  Brush,
  Droplet,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Hand,
  Palette,
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
  /** A third level: opening the section shows this list (+ "Хиты") before any products. `tag` matches products.attributes.tags. */
  items?: { label: string; tag: string }[];
  /** Optional attribute filter (products.attributes): a product must have this hair type — one product can sit in several such collections. */
  attr?: { hairType?: string };
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
const HAIR_CATEGORIES = ["Уход за волосами", "Шампуни", "Кондиционеры", "Маски для волос"];

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
        items: [
          { label: "Средства с микроиглами", tag: "microneedle" },
          { label: "Средства с ПДРН", tag: "pdrn" },
          { label: "Умывание", tag: "cleansing" },
          { label: "Снятие макияжа", tag: "makeup-removal" },
          { label: "Кремы", tag: "cream" },
          { label: "Тонеры и лосьоны", tag: "toner" },
          { label: "Сыворотки", tag: "serum" },
          { label: "Маски", tag: "mask" },
          { label: "Скрабы и пилинги", tag: "scrub" },
          { label: "Пэды", tag: "pad" },
          { label: "Для кожи вокруг глаз", tag: "eye" },
          { label: "Для губ", tag: "lips" },
          { label: "Для проблемной кожи", tag: "problem" },
          { label: "Антивозрастной уход", tag: "antiage" },
          { label: "Патчи", tag: "patch" },
        ],
      },
      {
        label: "Уход для тела",
        icon: PersonStanding,
        categories: ["Уход для тела"],
        items: [
          { label: "Кремы и лосьоны", tag: "body-cream" },
          { label: "Скрабы и пилинги", tag: "body-scrub" },
          { label: "Масла для тела", tag: "body-oil" },
          { label: "Антицеллюлитный уход", tag: "body-anticellulite" },
          { label: "Для рук", tag: "body-hands" },
          { label: "Для ног", tag: "body-feet" },
        ],
      },
      {
        label: "СПФ",
        icon: Sun,
        categories: ["SPF"],
        items: [
          { label: "Для лица", tag: "spf-face" },
          { label: "Для тела", tag: "spf-body" },
          { label: "Спреи и флюиды", tag: "spf-spray" },
          { label: "Стики", tag: "spf-stick" },
        ],
      },
      {
        label: "Массажеры",
        icon: Hand,
        categories: ["Массажеры"],
        items: [
          { label: "Для лица", tag: "massage-face" },
          { label: "Для тела", tag: "massage-body" },
        ],
      },
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
      { label: "Маски", icon: Sparkles, categories: ["Маски для волос"] },
      { label: "Сухие волосы", icon: Sun, categories: HAIR_CATEGORIES, attr: { hairType: "dry" } },
      { label: "Жирные волосы", icon: Droplet, categories: HAIR_CATEGORIES, attr: { hairType: "oily" } },
      { label: "Повреждённые волосы", icon: Scissors, categories: HAIR_CATEGORIES, attr: { hairType: "damaged" } },
      { label: "Окрашенные волосы", icon: Palette, categories: HAIR_CATEGORIES, attr: { hairType: "colored" } },
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
