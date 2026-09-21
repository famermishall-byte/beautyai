import {
  Baby,
  Brush,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Heart,
  House,
  PersonStanding,
  Scissors,
  Shirt,
  ShieldCheck,
  Smile,
  SprayCan,
  type LucideIcon,
} from "lucide-react";
import structure from "./catalog-structure.json";

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

/** A sub-category: matched by `tag` (products.attributes.tags) or by an attribute such as hair type. */
export type CatalogSub = {
  label: string;
  tag?: string;
  attr?: { hairType?: string };
};

export type CategoryGroup = {
  /** Identifier used in the URL (?group=...). */
  name: string;
  /** Tile caption on the search screen, when it differs from `name`. */
  label?: string;
  icon: LucideIcon;
  /** products.category values whose products belong to this main category. */
  categories: string[];
  /** Second level of the catalog (Каталог → категория → подкатегория → товары). */
  subs: CatalogSub[];
};

const ICONS: Record<string, LucideIcon> = {
  Baby,
  Brush,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Heart,
  House,
  PersonStanding,
  Scissors,
  Shirt,
  ShieldCheck,
  Smile,
  SprayCan,
};

// The structure itself lives in scripts/catalog-data.mjs (single source with the demo data) and is
// compiled to catalog-structure.json by `node scripts/build-catalog.mjs`.
export const CATEGORY_GROUPS: CategoryGroup[] = structure.groups.map((g) => ({
  name: g.name,
  label: (g as { label?: string }).label,
  icon: ICONS[g.icon] ?? Smile,
  categories: g.categories,
  subs: g.subs as CatalogSub[],
}));

/** The products.category values a main category covers, as a comma-list for /api/products. */
export function groupCategoryFilter(group: CategoryGroup): string {
  return group.categories.join(",");
}
