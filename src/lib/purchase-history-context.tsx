"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Order } from "@/types";

type PurchaseHistoryContextValue = {
  loading: boolean;
  /** Сколько раз (в скольких отдельных заказах, отменённые не считаются) куплен товар. */
  countOf: (productId: string) => number;
  /** Товары, купленные 2+ раза — кандидаты для «Не хотите купить снова?». */
  repeatProductIds: string[];
};

const PurchaseHistoryContext = createContext<PurchaseHistoryContextValue | null>(null);

export function PurchaseHistoryProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data: { orders: Order[] }) => {
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const order of data.orders ?? []) {
          if (order.status === "cancelled") continue;
          for (const item of order.items ?? []) {
            if (!item.productId) continue;
            next.set(item.productId, (next.get(item.productId) ?? 0) + 1);
          }
        }
        setCounts(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const repeatProductIds = [...counts.entries()].filter(([, count]) => count >= 2).map(([id]) => id);

  return (
    <PurchaseHistoryContext.Provider
      value={{ loading, countOf: (id) => counts.get(id) ?? 0, repeatProductIds }}
    >
      {children}
    </PurchaseHistoryContext.Provider>
  );
}

export function usePurchaseHistory() {
  const context = useContext(PurchaseHistoryContext);
  if (!context) throw new Error("usePurchaseHistory должен использоваться внутри PurchaseHistoryProvider");
  return context;
}
