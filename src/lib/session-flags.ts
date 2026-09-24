"use client";

// Мелкие пометки на одно посещение приложения (sessionStorage — пропадают, когда
// клиент закрывает и заново открывает приложение). Саму корзину (localStorage,
// см. cart-context.tsx) это не трогает — она хранится отдельно и не сбрасывается.
// Исключение — CART_MARKS_KEY ниже: он на localStorage, см. её собственный комментарий.

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

// «Добавлено в корзину» — галочка на карточке товара. Раньше жила в sessionStorage
// и держалась «пока открыто это посещение приложения» — на деле на телефонах при
// переходе в WhatsApp (отправка заказа) мобильный браузер/WebView часто в фоне
// перезагружает страницу, чтобы освободить память, а sessionStorage при такой
// перезагрузке стирается — галочка пропадала сразу после покупки. localStorage
// переживает это (как и сама корзина, которая уже хранится в localStorage) —
// снимается только явным удалением товара из корзины (unmarkAdded).
const CART_MARKS_KEY = "beautyai-cart-marks";

function readLocalSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeLocalSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // недоступно (приватный режим и т.п.) — пометка просто не переживёт перезагрузку
  }
}

export const isMarkedAdded = (productId: string) => readLocalSet(CART_MARKS_KEY).has(productId);

export function markAdded(productId: string) {
  const ids = readLocalSet(CART_MARKS_KEY);
  ids.add(productId);
  writeLocalSet(CART_MARKS_KEY, ids);
}

export function unmarkAdded(productId: string) {
  const ids = readLocalSet(CART_MARKS_KEY);
  ids.delete(productId);
  writeLocalSet(CART_MARKS_KEY, ids);
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

// Фирменная анимированная заставка (кольца + лого + слоган) — должна выходить только при
// РЕАЛЬНОМ открытии приложения (как видео-заставка при запуске обычного мобильного приложения),
// а не на каждом внутреннем переходе между страницами. На вебе с этим справлялся бы один
// sessionStorage-флаг на вкладку, но в Capacitor-обёртке на телефоне WebView периодически
// перезапускает страницу при обычной навигации/сворачивании — с обычным sessionStorage-флагом
// это выглядело так, будто заставка выскакивает при каждом переходе (жалоба владельца, 24.09).
// Решение: localStorage (переживает такие перезапуски WebView, в отличие от sessionStorage) +
// метка времени — заставка показывается снова только если с прошлого раза прошло достаточно
// времени, то есть это действительно новый заход, а не быстрый технический перезапуск WebView
// посреди работы с приложением.
const SPLASH_LAST_SHOWN_KEY = "beautyai-splash-last-shown";
const SPLASH_REOPEN_GAP_MS = 20 * 60 * 1000;

export function wasSplashShown(): boolean {
  try {
    const last = Number(localStorage.getItem(SPLASH_LAST_SHOWN_KEY) ?? 0);
    return Date.now() - last < SPLASH_REOPEN_GAP_MS;
  } catch {
    return false;
  }
}

export function markSplashShown() {
  try {
    localStorage.setItem(SPLASH_LAST_SHOWN_KEY, String(Date.now()));
  } catch {
    // недоступно — заставка может показаться повторно при следующем заходе, не критично
  }
}

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
