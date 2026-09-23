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

// «Добавлено в корзину» — галочка на карточке товара держится, пока открыто это
// посещение приложения, независимо от того, сколько страниц клиент успел посмотреть.
const CART_MARKS_KEY = "beautyai-cart-marks";

export const isMarkedAdded = (productId: string) => readSet(CART_MARKS_KEY).has(productId);

export function markAdded(productId: string) {
  const ids = readSet(CART_MARKS_KEY);
  ids.add(productId);
  writeSet(CART_MARKS_KEY, ids);
}

export function unmarkAdded(productId: string) {
  const ids = readSet(CART_MARKS_KEY);
  ids.delete(productId);
  writeSet(CART_MARKS_KEY, ids);
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
