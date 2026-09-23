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

// Всплывающий рекламный баннер — не чаще одного раза за посещение на каждый из двух входов:
// в каталог и в оформление заказа.
const CATALOG_AD_KEY = "beautyai-ad-catalog-shown";
const CHECKOUT_AD_KEY = "beautyai-ad-checkout-shown";

export const wasCatalogAdShown = () => readFlag(CATALOG_AD_KEY);
export const markCatalogAdShown = () => writeFlag(CATALOG_AD_KEY);
export const wasCheckoutAdShown = () => readFlag(CHECKOUT_AD_KEY);
export const markCheckoutAdShown = () => writeFlag(CHECKOUT_AD_KEY);
