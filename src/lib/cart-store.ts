import type { CartItem, Product } from "@/types";
import { applyDelta, quantityOf, removeProduct, setSelected } from "@/lib/cart-logic";

export type CartFetch = (url: string, init?: RequestInit) => Promise<Response>;
/** wholesaleThreshold — порог опта в сомах от сервера (null — опт не действует); пересчёт — applyWholesale. */
export type CartState = { items: CartItem[]; loaded: boolean; saveFailed: boolean; wholesaleThreshold: number | null };

const JSON_HEADERS = { "Content-Type": "application/json" };

type Current = () => boolean;
type Change = { next: CartItem[]; request: () => Promise<Response> };

/**
 * Корзина аккаунта без React (обёртка — cart-context.tsx, тесты — cart-store.test.ts).
 * Правила, ради которых она вынесена сюда:
 * - все запросы, включая перезагрузку, идут строго по очереди — перезагрузка не обгоняет запись;
 * - изменения считаются от последнего состояния, а не от кадра рендера — несколько добавлений подряд не теряются;
 * - пока корзина не загрузилась, изменение сначала берёт её с сервера — абсолютное количество не затирает серверное;
 * - flush() сообщает, дошло ли всё до сервера — заказ не уходит с галочкой, которая не сохранилась.
 */
export function createCartStore(fetchImpl: CartFetch, onChange: (state: CartState) => void) {
  let state: CartState = { items: [], loaded: false, saveFailed: false, wholesaleThreshold: null };
  let tail: Promise<unknown> = Promise.resolve();
  let failedSinceFlush = false;
  // Растёт при смене аккаунта: задачи, поставленные для прежнего аккаунта, ничего не меняют.
  let generation = 0;
  let account: string | null | undefined;

  const set = (patch: Partial<CartState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };

  // isWrite: только неудачная ЗАПИСЬ делает flush() ложным — неудачное чтение ничего не теряет.
  function enqueue(task: (current: Current) => Promise<boolean>, isWrite = true): Promise<boolean> {
    const gen = generation;
    const current = () => gen === generation;
    const run = tail.then(async () => {
      if (!current()) return true;
      let ok = false;
      try {
        ok = await task(current);
      } catch {
        ok = false;
      }
      if (!ok && isWrite && current()) failedSinceFlush = true;
      return ok;
    });
    tail = run;
    return run;
  }

  async function fetchItems(current: Current): Promise<boolean> {
    const res = await fetchImpl("/api/cart").catch(() => null);
    if (!res?.ok) return false;
    const data = (await res.json()) as { items?: CartItem[]; wholesaleThreshold?: number | null };
    if (current()) set({ items: data.items ?? [], loaded: true, wholesaleThreshold: data.wholesaleThreshold ?? null });
    return true;
  }

  // Запись не прошла — экран возвращается к тому, что на самом деле лежит на сервере.
  async function send(request: () => Promise<Response>, current: Current): Promise<boolean> {
    const res = await request().catch(() => null);
    if (res?.ok) return true;
    await fetchItems(current);
    if (current()) set({ saveFailed: true });
    return false;
  }

  function mutate(compute: (items: CartItem[]) => Change | null) {
    if (state.loaded) {
      const change = compute(state.items);
      if (!change) return;
      set({ items: change.next });
      enqueue((current) => send(change.request, current));
      return;
    }
    enqueue(async (current) => {
      if (!(await fetchItems(current))) {
        if (current()) set({ saveFailed: true });
        return false;
      }
      const change = compute(state.items);
      if (!change) return true;
      set({ items: change.next });
      return send(change.request, current);
    });
  }

  const put = (productId: string, quantity: number) => () =>
    fetchImpl("/api/cart", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ productId, quantity }) });
  const patch = (productIds: string[] | "all", selected: boolean) => () =>
    fetchImpl("/api/cart", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ productIds, selected }) });

  function changeBy(product: Product, delta: number) {
    mutate((items) => {
      const next = applyDelta(items, product, delta);
      return { next, request: put(product.id, quantityOf(next, product.id)) };
    });
  }

  return {
    getState: () => state,
    /** Первая загрузка корзины аккаунта; false — сервер недоступен (следующее изменение попробует снова). */
    load: () => enqueue((current) => fetchItems(current), false),
    /** Перечитать с сервера (корзина могла измениться на другом устройстве) — после всех отправленных изменений. */
    reload: () =>
      enqueue(async (current) => {
        const ok = await fetchItems(current);
        if (ok && current()) set({ saveFailed: false });
        return ok;
      }, false),
    /** Одноразовый перенос старой localStorage-корзины; её сбой не мешает оформлению заказа. */
    mergeLegacy: (items: { productId: string; quantity: number }[]) =>
      new Promise<boolean>((resolve) => {
        let ran = false;
        enqueue(async () => {
          ran = true;
          const res = await fetchImpl("/api/cart/merge", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ items }) }).catch(() => null);
          resolve(!!res?.ok);
          return true;
        }).then(() => {
          // Аккаунт сменился раньше, чем дошла очередь, — перенос не выполнялся.
          if (!ran) resolve(false);
        });
      }),
    add: (product: Product) => changeBy(product, 1),
    change: (productId: string, delta: number) => {
      const item = state.items.find((i) => i.product.id === productId);
      if (item) changeBy(item.product, delta);
    },
    remove: (productId: string) =>
      mutate((items) =>
        items.some((i) => i.product.id === productId)
          ? { next: removeProduct(items, productId), request: () => fetchImpl(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" }) }
          : null
      ),
    toggle: (productId: string) =>
      mutate((items) => {
        const item = items.find((i) => i.product.id === productId);
        return item ? { next: setSelected(items, [productId], !item.selected), request: patch([productId], !item.selected) } : null;
      }),
    setAll: (selected: boolean) => mutate((items) => ({ next: setSelected(items, "all", selected), request: patch("all", selected) })),
    /** Ждёт все отправленные изменения; false — что-то не сохранилось с прошлого flush (заказ отправлять нельзя). */
    flush: async () => {
      await tail;
      const ok = !failedSinceFlush;
      failedSinceFlush = false;
      return ok;
    },
    /**
     * Смена аккаунта: чужая корзина исчезает сразу, её незаконченные запросы больше ничего не меняют.
     * Тот же аккаунт — ничего не делает (true только при настоящей смене, тогда корзину нужно загрузить).
     */
    switchAccount: (key: string | null) => {
      if (key === account) return false;
      const firstAccount = account === undefined;
      account = key;
      // Первое появление аккаунта (сессия только что загрузилась) — не смена: то, что клиент успел
      // нажать до этого, остаётся в очереди и выполнится после загрузки корзины.
      if (firstAccount) return true;
      generation++;
      failedSinceFlush = false;
      tail = Promise.resolve();
      set({ items: [], loaded: false, saveFailed: false, wholesaleThreshold: null });
      return true;
    },
  };
}

export type CartStore = ReturnType<typeof createCartStore>;
