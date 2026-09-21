import type { Product } from "@/types";
import { buildRoutine, type SkinType, type SkinConcern } from "@/lib/skincare";
import { buildHairTips, HAIR_STEMS, type HairType, type HairConcern } from "@/lib/haircare";
import { fitByStems, skinFit } from "@/lib/personalization";

export type KitStep = { label: string; category: string; product: Product | null };

type T = (key: string) => string;
type RawT = T & { raw: (key: string) => unknown };
/** Translators for the namespaces the kit reads: "kit" (step names), "skin" and "hair" (tips). */
export type KitTranslators = { kit: T; skin: RawT; hair: T };

export type CareKit = {
  skinSteps: KitStep[];
  hairProducts: Product[];
  skinTips: string[];
  hairTips: string[];
};

// The steps of a basic routine, in order, and the catalog category each one
// is filled from. Masks are a weekly extra, not a daily step.
// (`key` -> message "kit.steps.<key>"; `category` is catalog data and stays as stored.)
const SKIN_STEPS: { key: string; category: string }[] = [
  { key: "cleansing", category: "Очищение" },
  { key: "toner", category: "Тоники" },
  { key: "serum", category: "Сыворотки" },
  { key: "cream", category: "Кремы" },
  { key: "spf", category: "SPF" },
  { key: "mask", category: "Маски" },
];

// A gentle nudge (not a filter): a concern prefers products that mention a
// matching ingredient or claim in their own text.
const CONCERN_KEYWORDS: Partial<Record<SkinConcern, string[]>> = {
  dryness: ["гиалурон", "увлажня", "питательн"],
  oiliness: ["ниацинамид", "матир"],
  acne: ["ниацинамид", "салицил"],
  redness: ["успокаив"],
  sensitivity: ["успокаив", "без отдушек"],
  pigmentation: ["витамин c"],
  aging: ["питательн", "ретинол"],
};

function textOf(p: Product): string {
  return [p.name, p.description, p.characteristics].filter(Boolean).join(" ").toLowerCase();
}

function pickBest<T extends Product>(candidates: T[], score: (p: T) => number): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const p of candidates) {
    const s = score(p) + (p.imageUrl ? 0.2 : 0);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

export function buildCareKit(
  products: Product[],
  skinType: SkinType | null,
  skinConcerns: SkinConcern[],
  hairType: HairType | null,
  hairConcerns: HairConcern[],
  t: KitTranslators
): CareKit {
  const skinSteps: KitStep[] = [];
  if (skinType) {
    const keywords = skinConcerns.flatMap((c) => CONCERN_KEYWORDS[c] ?? []);
    for (const step of SKIN_STEPS) {
      const inCategory = products.filter((p) => p.category === step.category && p.inStock !== false);
      const fitting = inCategory.filter((p) => skinFit(p, skinType) > 0);
      const pool = fitting.length > 0 ? fitting : [];
      const product = pickBest(pool, (p) => {
        const text = textOf(p);
        return skinFit(p, skinType) + keywords.filter((k) => text.includes(k)).length * 0.5;
      });
      skinSteps.push({ label: t.kit(`steps.${step.key}`), category: step.category, product });
    }
  }

  let hairProducts: Product[] = [];
  if (hairType || hairConcerns.length > 0) {
    const hairPool = products.filter((p) => p.category === "Уход за волосами" && p.inStock !== false);
    const allStems = Object.values(HAIR_STEMS);
    const fitOf = (p: Product) => (hairType ? fitByStems(p.purpose, HAIR_STEMS[hairType], allStems) : 1);
    hairProducts = hairPool
      .filter((p) => fitOf(p) > 0)
      .sort((a, b) => fitOf(b) - fitOf(a) || Number(!!b.imageUrl) - Number(!!a.imageUrl))
      .slice(0, 3);
  }

  return {
    skinSteps,
    hairProducts,
    skinTips: skinType ? buildRoutine(t.skin, skinType, skinConcerns).tips : [],
    hairTips: buildHairTips(t.hair, hairType, hairConcerns),
  };
}
