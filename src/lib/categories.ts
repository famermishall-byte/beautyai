import {
  Baby,
  Brush,
  Droplet,
  Droplets,
  FlaskConical,
  Gem,
  Gift,
  Heart,
  House,
  Scissors,
  Shirt,
  ShieldCheck,
  SprayCan,
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
  "Макияж",
  "Уход за волосами",
];

export type CategoryGroup = {
  /** Identifier used in the URL (?group=...) — also the products.category to filter by when `children` is empty. */
  name: string;
  /** Tile caption on the search screen, when it differs from `name`. */
  label?: string;
  icon: LucideIcon;
  /** Sub-categories shown as chips once this group is picked. Empty means the tile goes straight to the filtered catalog. */
  children: string[];
};

// A navigation layer on top of the flat category list above — grouping is
// purely presentational (search-screen tiles → catalog chips), so it doesn't
// touch products.category or the import pipeline. Groups whose category has no
// products yet simply open an empty catalog until such products are imported.
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Уход за кожей",
    icon: Droplet,
    children: ["Уход за лицом", "Очищение", "Тоники", "Сыворотки", "Кремы", "SPF", "Маски", "Уход за глазами"],
  },
  { name: "Макияж", icon: Brush, children: [] },
  { name: "Парфюм", icon: SprayCan, children: [] },
  { name: "Уход за волосами", label: "Волосы", icon: Scissors, children: [] },
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
