"use client";

import { useState } from "react";
import type { Product, RecommendedProduct } from "@/types";
import { useCart } from "@/lib/cart-context";
import { useMyBag } from "@/lib/mybag-context";

export function ProductCard({ product }: { product: Product | RecommendedProduct }) {
  const { addItem } = useCart();
  const { toggle, isSaved } = useMyBag();
  const [justAdded, setJustAdded] = useState(false);
  const reason = "reason" in product ? product.reason : null;
  const saved = isSaved(product.id);

  function handleAdd() {
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-black/5 overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-accent-soft flex items-center justify-center text-4xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span>💄</span>
        )}
        <button
          onClick={() => toggle(product)}
          aria-label={saved ? "Убрать из косметички" : "Сохранить в косметичку"}
          aria-pressed={saved}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-lg shadow-sm transition hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {saved ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted">{product.brand}</div>
        <h3 className="font-display text-lg leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted line-clamp-2">{product.description}</p>
        )}
        {reason && (
          <div className="text-sm bg-accent-soft text-accent rounded-lg px-3 py-2 mt-1">{reason}</div>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-display text-xl">{product.price.toLocaleString("ru-RU")} сом</span>
          <button
            onClick={handleAdd}
            className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {justAdded ? "Добавлено ✓" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
