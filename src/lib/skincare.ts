// Rule-based skin care logic — no AI, no external calls. A fixed lookup
// table mapping skin type + concerns to a morning/evening routine, matching
// exactly the kind of guidance a beauty consultant would give by hand.

export type SkinType = "dry" | "oily" | "combination" | "normal" | "sensitive";

export type SkinConcern =
  | "dryness"
  | "oiliness"
  | "acne"
  | "blackheads"
  | "redness"
  | "pigmentation"
  | "sensitivity"
  | "aging";

// Display text lives in messages (namespace "skin": types.*, concerns.*, routine.*, concernTips.*).
// Label helpers take the translator of that namespace: `const t = useTranslations("skin")`.
export const SKIN_TYPES: { value: SkinType }[] = [
  { value: "dry" },
  { value: "oily" },
  { value: "combination" },
  { value: "normal" },
  { value: "sensitive" },
];

export const SKIN_CONCERNS: { value: SkinConcern }[] = [
  { value: "dryness" },
  { value: "oiliness" },
  { value: "acne" },
  { value: "blackheads" },
  { value: "redness" },
  { value: "pigmentation" },
  { value: "sensitivity" },
  { value: "aging" },
];

type SkinT = (key: string) => string;
type SkinRawT = SkinT & { raw: (key: string) => unknown };

export function skinTypeLabel(t: SkinT, value: string | null): string | null {
  return SKIN_TYPES.some((x) => x.value === value) ? t(`types.${value}`) : null;
}

export function skinConcernLabel(t: SkinT, value: string): string {
  return SKIN_CONCERNS.some((c) => c.value === value) ? t(`concerns.${value}`) : value;
}

export type Routine = {
  morning: string[];
  evening: string[];
  tips: string[];
};

export function buildRoutine(t: SkinRawT, skinType: SkinType | null, concerns: SkinConcern[]): Routine {
  const type = skinType ?? "normal";
  const list = (key: string) => t.raw(`routine.${type}.${key}`) as string[];
  const extraTips = concerns.filter((c) => SKIN_CONCERNS.some((x) => x.value === c)).map((c) => t(`concernTips.${c}`));

  return {
    morning: list("morning"),
    evening: list("evening"),
    tips: [...list("tips"), ...extraTips],
  };
}
