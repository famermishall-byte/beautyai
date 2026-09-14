"use client";

import { useState } from "react";
import type { RecommendedProduct } from "@/types";
import { useCart } from "@/lib/cart-context";

export function ProductCard({ product }: { product: RecommendedProduct }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-black/5 overflow-hidden flex flex-col">
      <div className="aspect-square bg-accent-soft flex items-center justify-center text-4xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span>💄</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted">{product.brand}</div>
        <h3 className="font-display text-lg leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted line-clamp-2">{product.description}</p>
        )}
        <div className="text-sm bg-accent-soft text-accent rounded-lg px-3 py-2 mt-1">
          {product.reason}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-display text-xl">{product.price.toLocaleString("ru-RU")} сом</span>
          <button
            onClick={handleAdd}
            className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {justAdded ? "Добавлено ✓" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
