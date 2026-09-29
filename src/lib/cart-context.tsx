"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { useSession } from "@/lib/session-context";
import { applyDelta, cartTotals, parseLegacyCart, quantityOf, removeProduct, setSelected } from "@/lib/cart-logic";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  /** Последнее изменение не сохранилось на сервере (корзина уже перезагружена с сервера). */
  saveFailed: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  changeQuantity: (productId: string, delta: number) => void;
  toggleSelected: (productId: string) => void;
  setAllSelected: (selected: boolean) => void;
  reload: () => Promise<void>;
  /** Resolves when every change sent so far has reached the server — call before placing an order. */
  flush: () => Promise<void>;
  totalCount: number;
  selectedCount: number;
  selectedTotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

// До 29.09 корзина жила только в localStorage — при первом входе её содержимое переносится в аккаунт.
const LEGACY_STORAGE_KEY = "beautyai-cart";
const JSON_HEADERS = { "Content-Type": "application/json" };

function removeLegacyCart() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // недоступно — не критично
  }
}

/**
 * Корзина хранится в аккаунте (таблица cart_items, /api/cart) — одна и та же на любом устройстве,
 * пока клиент сам не удалит товар или не закажет его. Изменения видны сразу (оптимистично), а запросы
 * уходят строго по очереди, чтобы быстрые нажатия не перегоняли друг друга. Локального кэша корзины
 * нет намеренно: на общем телефоне корзина одного аккаунта не должна мелькать у другого.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  // Смена аккаунта (выход / вход другим) — перезагрузка корзины с нуля.
  const accountKey = session ? `${session.storeId}:${session.email ?? ""}` : null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const reload = useCallback(async () => {
    const res = await fetch("/api/cart");
    if (!res.ok) throw new Error("cart load failed");
    const data: { items?: CartItem[] } = await res.json();
    setItems(data.items ?? []);
    setSaveFailed(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    // Loading the account's cart from the server when the session appears / changes — a genuine
    // "synchronize with an external system" effect; state is only set in promise callbacks.
    (async () => {
      if (!accountKey) {
        await Promise.resolve();
        if (!cancelled) {
          setItems([]);
          setHydrated(true);
        }
        return;
      }
      let legacyRaw: string | null = null;
      try {
        legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      } catch {
        // недоступно — переносить нечего
      }
      const legacy = parseLegacyCart(legacyRaw);
      if (legacyRaw !== null && legacy.length === 0) removeLegacyCart();
      if (legacy.length > 0) {
        const res = await fetch("/api/cart/merge", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ items: legacy }) }).catch(() => null);
        if (res?.ok) removeLegacyCart();
      }
      const res = await fetch("/api/cart").catch(() => null);
      const data: { items?: CartItem[] } = res?.ok ? await res.json() : { items: [] };
      if (!cancelled) {
        setItems(data.items ?? []);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, accountKey]);

  const send = useCallback(
    (request: () => Promise<Response>) => {
      queue.current = queue.current.then(async () => {
        try {
          const res = await request();
          if (!res.ok) throw new Error("cart save failed");
        } catch {
          await reload().catch(() => {});
          setSaveFailed(true);
        }
      });
    },
    [reload]
  );

  const putQuantity = (productId: string, quantity: number) =>
    send(() => fetch("/api/cart", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ productId, quantity }) }));

  const addItem = (product: Product) => {
    const next = applyDelta(items, product, 1);
    setItems(next);
    putQuantity(product.id, quantityOf(next, product.id));
  };

  const changeQuantity = (productId: string, delta: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    const next = applyDelta(items, item.product, delta);
    setItems(next);
    putQuantity(productId, quantityOf(next, productId));
  };

  const removeItem = (productId: string) => {
    setItems(removeProduct(items, productId));
    send(() => fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" }));
  };

  const toggleSelected = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    setItems(setSelected(items, [productId], !item.selected));
    send(() => fetch("/api/cart", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ productIds: [productId], selected: !item.selected }) }));
  };

  const setAllSelected = (selected: boolean) => {
    setItems(setSelected(items, "all", selected));
    send(() => fetch("/api/cart", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ productIds: "all", selected }) }));
  };

  const flush = () => queue.current;

  const totals = useMemo(() => cartTotals(items), [items]);

  return (
    <CartContext.Provider
      value={{ items, hydrated, saveFailed, addItem, removeItem, changeQuantity, toggleSelected, setAllSelected, reload, flush, ...totals }}
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
