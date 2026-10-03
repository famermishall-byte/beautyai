"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { useSession } from "@/lib/session-context";
import { cartTotals, parseLegacyCart } from "@/lib/cart-logic";
import { createCartStore, type CartState } from "@/lib/cart-store";
import { applyWholesale, type WholesaleSummary } from "@/lib/wholesale";

type CartContextValue = {
  /** Уже с оптовыми ценами, если корзина набрала порог (обычная цена — в product.retailPrice). */
  items: CartItem[];
  /** The account's cart has been loaded from the server at least once. */
  hydrated: boolean;
  /** Последнее изменение не сохранилось на сервере (корзина уже перезагружена с сервера). */
  saveFailed: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  /** «Отменить» после удаления — вернуть строку как была. */
  restoreItem: (productId: string) => void;
  changeQuantity: (productId: string, delta: number) => void;
  toggleSelected: (productId: string) => void;
  setAllSelected: (selected: boolean) => void;
  reload: () => Promise<boolean>;
  /** Waits for every change sent so far; false = something did not reach the server, don't place the order. */
  flush: () => Promise<boolean>;
  totalCount: number;
  selectedCount: number;
  selectedTotal: number;
  /** Опт: порог, набран ли, сколько осталось, экономия (threshold null — опт не действует). */
  wholesale: WholesaleSummary;
};

const CartContext = createContext<CartContextValue | null>(null);

// До 29.09 корзина жила только в localStorage — при первом входе её содержимое переносится в аккаунт.
const LEGACY_STORAGE_KEY = "beautyai-cart";

/**
 * Корзина хранится в аккаунте (таблица cart_items, /api/cart) — одна и та же на любом устройстве,
 * пока клиент сам не удалит товар или не закажет его. Вся логика очереди запросов — в cart-store.ts;
 * здесь только связь с React и сессией. Локального кэша корзины нет намеренно: на общем телефоне
 * корзина одного аккаунта не должна мелькать у другого.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  // Смена аккаунта (выход / вход другим) — корзина загружается с нуля.
  const accountKey = session ? `${session.storeId}:${session.email ?? ""}` : null;
  const [state, setState] = useState<CartState>({ items: [], loaded: false, saveFailed: false, wholesaleThreshold: null });
  const [store] = useState(() => createCartStore((url, init) => fetch(url, init), setState));

  useEffect(() => {
    if (loading) return;
    // Loading the account's cart from the server when the session appears / changes — a genuine
    // "synchronize with an external system" effect; state changes arrive through the store callback.
    // Повторный запуск эффекта для того же аккаунта (например, двойной запуск в dev) ничего не сбрасывает.
    if (!store.switchAccount(accountKey) || !accountKey) return;
    let legacy: { productId: string; quantity: number }[] = [];
    try {
      legacy = parseLegacyCart(localStorage.getItem(LEGACY_STORAGE_KEY));
      // Убираем ключ до запроса: перенос прибавляет количества, повторный перенос их удвоил бы.
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // недоступно — переносить нечего
    }
    if (legacy.length > 0) {
      store.mergeLegacy(legacy).then((ok) => {
        if (ok) return;
        try {
          localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy.map((i) => ({ product: { id: i.productId }, quantity: i.quantity }))));
        } catch {
          // недоступно — не критично
        }
      });
    }
    store.load();
  }, [loading, accountKey, store]);

  // Тот же пересчёт, что делает сервер при оформлении (lib/wholesale.ts) — сумма на экране = сумма заказа.
  const priced = useMemo(() => applyWholesale(state.items, state.wholesaleThreshold), [state.items, state.wholesaleThreshold]);
  const totals = useMemo(() => cartTotals(priced.items), [priced.items]);

  return (
    <CartContext.Provider
      value={{
        items: priced.items,
        wholesale: priced.summary,
        hydrated: state.loaded,
        saveFailed: state.saveFailed,
        addItem: store.add,
        removeItem: store.remove,
        restoreItem: store.restore,
        changeQuantity: store.change,
        toggleSelected: store.toggle,
        setAllSelected: store.setAll,
        reload: store.reload,
        flush: store.flush,
        ...totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart должен использоваться внутри CartProvider");
  return context;
}
