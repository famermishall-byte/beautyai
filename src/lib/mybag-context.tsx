"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Product } from "@/types";

type MyBagContextValue = {
  products: Product[];
  savedIds: Set<string>;
  loading: boolean;
  toggle: (product: Product) => Promise<void>;
  /** Вернуть товар в косметичку («Отменить» после удаления) — не зависит от того, что было на экране в момент нажатия. */
  save: (product: Product) => Promise<void>;
  isSaved: (productId: string) => boolean;
};

const MyBagContext = createContext<MyBagContextValue | null>(null);

export function MyBagProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mybag")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(product: Product) {
    setProducts((prev) => (prev.some((p) => p.id === product.id) ? prev : [product, ...prev]));
    try {
      const res = await fetch("/api/mybag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  }

  async function toggle(product: Product) {
    const alreadySaved = products.some((p) => p.id === product.id);

    if (alreadySaved) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      try {
        await fetch(`/api/mybag?productId=${product.id}`, { method: "DELETE" });
      } catch {
        setProducts((prev) => [...prev, product]);
      }
    } else {
      setProducts((prev) => [product, ...prev]);
      try {
        await fetch("/api/mybag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
      } catch {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
      }
    }
  }

  const savedIds = new Set(products.map((p) => p.id));

  return (
    <MyBagContext.Provider
      value={{ products, savedIds, loading, toggle, save, isSaved: (id) => savedIds.has(id) }}
    >
      {children}
    </MyBagContext.Provider>
  );
}

export function useMyBag() {
  const context = useContext(MyBagContext);
  if (!context) throw new Error("useMyBag должен использоваться внутри MyBagProvider");
  return context;
}
