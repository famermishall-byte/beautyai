// Rule-based hair care questions and advice — same spirit as skincare.ts: a
// fixed lookup, no AI, the kind of guidance a consultant would give by hand.

export type HairType = "dry" | "oily" | "normal" | "combination";

export type HairConcern = "hairloss" | "breakage" | "dandruff" | "dullness" | "splitends" | "frizz" | "colored";

// Display text lives in messages (namespace "hair": types.*, concerns.*, typeTips.*, concernTips.*).
export const HAIR_TYPES: { value: HairType }[] = [
  { value: "dry" },
  { value: "oily" },
  { value: "normal" },
  { value: "combination" },
];

export const HAIR_CONCERNS: { value: HairConcern }[] = [
  { value: "hairloss" },
  { value: "breakage" },
  { value: "dandruff" },
  { value: "dullness" },
  { value: "splitends" },
  { value: "frizz" },
  { value: "colored" },
];

type HairT = (key: string) => string;

export function hairTypeLabel(t: HairT, value: string | null): string | null {
  return HAIR_TYPES.some((x) => x.value === value) ? t(`types.${value}`) : null;
}

export function hairConcernLabel(t: HairT, value: string): string {
  return HAIR_CONCERNS.some((c) => c.value === value) ? t(`concerns.${value}`) : value;
}

export function buildHairTips(t: HairT, type: HairType | null, concerns: HairConcern[]): string[] {
  const tips: string[] = [];
  if (type) tips.push(t(`typeTips.${type}`));
  for (const c of concerns) tips.push(t(`concernTips.${c}`));
  return tips;
}

// How a product's "для кого" text names each hair type (word stems).
export const HAIR_STEMS: Record<HairType, string> = {
  dry: "сух",
  oily: "жирн",
  normal: "нормальн",
  combination: "комбинир",
};
