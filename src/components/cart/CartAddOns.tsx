"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { ADD_ON_MAX_PRICE, pickAddOns } from "@/lib/add-ons";
import type { Product } from "@/types";

/**
 * «Добавить к заказу» над оформлением: недорогие популярные товары, в корзину одним нажатием (сразу с галочкой).
 * Нет подходящих — блока нет.
 */
export function CartAddOns() {
  const t = useTranslations("cartAddOns");
  const price = usePrice();
  const text = useProductText();
  const { items, addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/bestsellers?maxPrice=${ADD_ON_MAX_PRICE}&limit=24`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products?: Product[] }) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = pickAddOns(products, new Set(items.map((i) => i.product.id)));
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="cart-add-ons" className="-mx-5">
      <h3 id="cart-add-ons" className="px-5 text-sm font-semibold mb-2">
        {t("title")}
      </h3>
      <ul className="flex gap-2.5 overflow-x-auto px-5 scroll-px-5 pb-1 snap-x">
        {shown.map((p) => (
          <li key={p.id} className="snap-start shrink-0 w-28 rounded-[var(--radius-card)] border border-border bg-card p-2 flex flex-col">
            <div className="aspect-square rounded-lg bg-accent-soft overflow-hidden flex items-center justify-center mb-1.5">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Sparkle className="size-5 text-accent/35" strokeWidth={1.4} aria-hidden />
              )}
            </div>
            <div className="text-[11px] leading-snug line-clamp-2 min-h-[2.1rem]">{text(p).name}</div>
            <div className="mt-auto pt-1 flex items-center justify-between gap-1">
              <span className="text-xs font-semibold tabular-nums">{price(p.price)}</span>
              <button
                type="button"
                onClick={() => addItem(p)}
                aria-label={t("add", { name: text(p).name })}
                className="size-8 shrink-0 rounded-full bg-accent text-white flex items-center justify-center transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <Plus className="size-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
