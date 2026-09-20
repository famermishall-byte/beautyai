// Rule-based hair care questions and advice — same spirit as skincare.ts: a
// fixed lookup, no AI, the kind of guidance a consultant would give by hand.

export type HairType = "dry" | "oily" | "normal" | "combination";

export type HairConcern = "hairloss" | "breakage" | "dandruff" | "dullness" | "splitends" | "frizz" | "colored";

export const HAIR_TYPES: { value: HairType; label: string }[] = [
  { value: "dry", label: "Сухие" },
  { value: "oily", label: "Жирные" },
  { value: "normal", label: "Нормальные" },
  { value: "combination", label: "Жирные у корней, сухие на концах" },
];

export const HAIR_CONCERNS: { value: HairConcern; label: string }[] = [
  { value: "hairloss", label: "Выпадение" },
  { value: "breakage", label: "Ломкость" },
  { value: "dandruff", label: "Перхоть" },
  { value: "dullness", label: "Тусклость" },
  { value: "splitends", label: "Секущиеся кончики" },
  { value: "frizz", label: "Пушатся" },
  { value: "colored", label: "Окрашенные" },
];

export function hairTypeLabel(value: string | null): string | null {
  return HAIR_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function hairConcernLabel(value: string): string {
  return HAIR_CONCERNS.find((c) => c.value === value)?.label ?? value;
}

const TYPE_TIPS: Record<HairType, string> = {
  dry: "Мойте голову тёплой, а не горячей водой и не забывайте про маску или бальзам после шампуня.",
  oily: "Наносите шампунь на кожу головы, а бальзам — только на длину, не касаясь корней.",
  normal: "Достаточно мягкого шампуня и бальзама; маску можно использовать раз в неделю.",
  combination: "Шампунь — на корни, маска или масло — только на кончики.",
};

const CONCERN_TIPS: Record<HairConcern, string> = {
  hairloss: "При заметном выпадении лучше проконсультироваться с врачом-трихологом; уходовые средства лишь помогают.",
  breakage: "Расчёсывайте волосы мягкой щёткой, начиная с кончиков, и не расчёсывайте мокрые волосы.",
  dandruff: "Подберите шампунь для чувствительной кожи головы и не пользуйтесь слишком горячей водой.",
  dullness: "Ополаскивайте волосы прохладной водой в конце мытья — чешуйки закрываются, появляется блеск.",
  splitends: "Регулярно подравнивайте кончики и наносите на них несмываемое масло или сыворотку.",
  frizz: "Промокайте волосы полотенцем, а не растирайте, и используйте несмываемый уход.",
  colored: "Выбирайте средства для окрашенных волос — они помогают дольше сохранять цвет.",
};

export function buildHairTips(type: HairType | null, concerns: HairConcern[]): string[] {
  const tips: string[] = [];
  if (type) tips.push(TYPE_TIPS[type]);
  for (const c of concerns) tips.push(CONCERN_TIPS[c]);
  return tips;
}

// How a product's "для кого" text names each hair type (word stems).
export const HAIR_STEMS: Record<HairType, string> = {
  dry: "сух",
  oily: "жирн",
  normal: "нормальн",
  combination: "комбинир",
};
