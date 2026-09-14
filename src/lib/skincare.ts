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

export const SKIN_TYPES: { value: SkinType; label: string }[] = [
  { value: "dry", label: "Сухая" },
  { value: "oily", label: "Жирная" },
  { value: "combination", label: "Комбинированная" },
  { value: "normal", label: "Нормальная" },
  { value: "sensitive", label: "Чувствительная" },
];

export const SKIN_CONCERNS: { value: SkinConcern; label: string }[] = [
  { value: "dryness", label: "Сухость" },
  { value: "oiliness", label: "Жирный блеск" },
  { value: "acne", label: "Высыпания" },
  { value: "blackheads", label: "Чёрные точки" },
  { value: "redness", label: "Покраснение" },
  { value: "pigmentation", label: "Пигментация" },
  { value: "sensitivity", label: "Чувствительность" },
  { value: "aging", label: "Первые признаки возрастных изменений" },
];

export function skinTypeLabel(value: string | null): string | null {
  return SKIN_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function skinConcernLabel(value: string): string {
  return SKIN_CONCERNS.find((c) => c.value === value)?.label ?? value;
}

export type Routine = {
  morning: string[];
  evening: string[];
  tips: string[];
};

const BASE_ROUTINES: Record<SkinType, Routine> = {
  dry: {
    morning: ["Мягкое очищение", "Увлажняющий тоник", "Сыворотка с гиалуроновой кислотой", "Питательный крем", "SPF"],
    evening: ["Очищение", "Сыворотка", "Питательный крем"],
    tips: ["Избегайте спиртосодержащих средств — они дополнительно сушат кожу."],
  },
  oily: {
    morning: ["Гель для умывания", "Лёгкий тоник", "Сыворотка с ниацинамидом", "Лёгкий увлажняющий крем", "SPF"],
    evening: ["Очищение", "Тоник", "Сыворотка", "Лёгкий крем"],
    tips: ["Раз в неделю можно добавить мягкий пилинг или очищающую маску."],
  },
  combination: {
    morning: ["Очищение", "Тоник", "Сыворотка", "Увлажняющий крем", "SPF"],
    evening: ["Очищение", "Сыворотка", "Крем"],
    tips: ["Т-зону (лоб, нос, подбородок) можно ухаживать отдельно средствами для жирной кожи."],
  },
  normal: {
    morning: ["Очищение", "Тоник", "Сыворотка", "Увлажняющий крем", "SPF"],
    evening: ["Очищение", "Сыворотка", "Крем"],
    tips: [],
  },
  sensitive: {
    morning: ["Мягкое очищение без отдушек", "Успокаивающий тоник", "Сыворотка", "Увлажняющий крем", "SPF"],
    evening: ["Мягкое очищение", "Успокаивающий крем"],
    tips: ["Перед первым использованием нового средства проверьте реакцию на небольшом участке кожи."],
  },
};

const CONCERN_TIPS: Partial<Record<SkinConcern, string>> = {
  acne: "Ищите средства с салициловой кислотой или цинком — они помогают при высыпаниях.",
  blackheads: "Регулярное мягкое отшелушивание (1–2 раза в неделю) помогает с чёрными точками.",
  redness: "Средства с пантенолом или центеллой помогают снять покраснение.",
  pigmentation: "Ищите средства с витамином C утром и обязательно используйте SPF днём.",
  sensitivity: "Выбирайте средства без отдушек и спирта, вводите новинки по одной.",
  aging: "Средства с ретинолом лучше вводить вечером и постепенно, начиная с небольшой частоты.",
  dryness: "Наносите увлажняющий крем на слегка влажную кожу — так он удерживает больше влаги.",
  oiliness: "Не пропускайте увлажнение — обезвоженная кожа вырабатывает ещё больше себума.",
};

export function buildRoutine(skinType: SkinType | null, concerns: SkinConcern[]): Routine {
  const base = BASE_ROUTINES[skinType ?? "normal"];
  const extraTips = concerns
    .map((c) => CONCERN_TIPS[c])
    .filter((tip): tip is string => Boolean(tip));

  return {
    morning: base.morning,
    evening: base.evening,
    tips: [...base.tips, ...extraTips],
  };
}
