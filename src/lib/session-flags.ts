"use client";

// Мелкие пометки на одно посещение приложения (sessionStorage — пропадают, когда
// клиент закрывает и заново открывает приложение). Саму корзину (localStorage,
// см. cart-context.tsx) это не трогает — она хранится отдельно и не сбрасывается.

function readSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(key: string, ids: Set<string>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // недоступно (приватный режим и т.п.) — пометка просто не переживёт это открытие приложения
  }
}

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // недоступно — предложение может показаться повторно в этом же заходе
  }
}

// «Не хотите купить снова?» — не чаще одного раза за посещение: один раз на
// главной и один раз на странице каждого конкретного товара.
const HOME_PROMPT_KEY = "beautyai-buyagain-home-shown";

export const wasHomePromptShown = () => readFlag(HOME_PROMPT_KEY);
export const markHomePromptShown = () => writeFlag(HOME_PROMPT_KEY);

const PRODUCT_PROMPT_KEY = "beautyai-buyagain-product-shown";

export const wasProductPromptShown = (productId: string) => readSet(PRODUCT_PROMPT_KEY).has(productId);

export function markProductPromptShown(productId: string) {
  const ids = readSet(PRODUCT_PROMPT_KEY);
  ids.add(productId);
  writeSet(PRODUCT_PROMPT_KEY, ids);
}

// Всплывающий рекламный баннер — не чаще одного раза за посещение на каждый из входов:
// главная, каталог, оформление заказа.
const AD_KEYS = {
  home: "beautyai-ad-home-shown",
  catalog: "beautyai-ad-catalog-shown",
  checkout: "beautyai-ad-checkout-shown",
} as const;
export type AdPage = keyof typeof AD_KEYS;
export const wasAdShown = (page: AdPage) => readFlag(AD_KEYS[page]);
export const markAdShown = (page: AdPage) => writeFlag(AD_KEYS[page]);

// Сигнал «только что зарегистрировался» — ставит login/page.tsx в момент успешной регистрации,
// FirstRunFlow.tsx читает и сразу стирает (consume): анкета «Включить уведомления?/геолокацию?»
// должна всплывать РОВНО один раз, сразу после регистрации — не при обычном входе в уже
// существующий аккаунт и не когда владелец/менеджер заходит в витрину из админки (по жалобе
// владельца, 24.09: раньше всплывало на каждом таком входе).
const JUST_REGISTERED_KEY = "beautyai-just-registered";
export const markJustRegistered = () => writeFlag(JUST_REGISTERED_KEY);
export function consumeJustRegistered(): boolean {
  const was = readFlag(JUST_REGISTERED_KEY);
  if (was) {
    try {
      sessionStorage.removeItem(JUST_REGISTERED_KEY);
    } catch {
      // недоступно — не критично, ниже по коду этот путь всё равно больше не пройдёт
    }
  }
  return was;
}

// Отдельное всплывающее окно про активную акцию (скидка на товар) — своё, не баннерное; тоже
// не чаще раза за посещение, на главной, в каталоге и в профиле (по просьбе владельца, 24.09) —
// на каждой странице своя акция по номеру, см. MarketingGate.tsx/PromotionInterstitial.tsx.
const PROMO_AD_KEYS = {
  home: "beautyai-promo-ad-home-shown",
  catalog: "beautyai-promo-ad-catalog-shown",
  profile: "beautyai-promo-ad-profile-shown",
} as const;
export type PromoAdPage = keyof typeof PROMO_AD_KEYS;
export const wasPromoAdShown = (page: PromoAdPage) => readFlag(PROMO_AD_KEYS[page]);
export const markPromoAdShown = (page: PromoAdPage) => writeFlag(PROMO_AD_KEYS[page]);
