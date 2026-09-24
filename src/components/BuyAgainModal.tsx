"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import { markAdded } from "@/lib/session-flags";
import type { Product } from "@/types";

import { buttonClasses } from "@/components/ui/Button";
/** «Не хотите купить снова?» — товар, который клиент уже покупал 2+ раза. */
export function BuyAgainModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const t = useTranslations("buyAgain");
  const price = usePrice();
  const text = useProductText();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { product: Product } | null) => {
        if (!cancelled && data) setProduct(data.product);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!product) return null;

  function handleBuyAgain() {
    if (!product) return;
    addItem(product);
    markAdded(product.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-overlay flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onClose} />
      <div className="tile-sheen relative w-full max-w-sm overflow-hidden rounded-sheet bg-card border border-border shadow-modal p-5 animate-rise-in">
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="absolute top-3 right-3 z-raised w-9 h-9 rounded-full bg-card/90 flex items-center justify-center shadow-control transition hover:scale-105 active:scale-90 focus-ring"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-accent mb-3">
          <RotateCcw className="size-3.5" strokeWidth={2.5} aria-hidden />
          {t("title")}
        </div>

        <div className="flex gap-3 items-center mb-4">
          <div className="w-16 h-16 rounded-card overflow-hidden bg-accent-soft shrink-0">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={text(product).name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-2xs uppercase tracking-wide text-muted font-medium truncate">{product.brand}</div>
            <div className="font-display text-md leading-snug line-clamp-2">{text(product).name}</div>
            <div className="font-display text-base mt-0.5">{price(product.price)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={buttonClasses({ variant: "ghost", className: "flex-1" })}
          >
            {t("dismiss")}
          </button>
          <button
            onClick={handleBuyAgain}
            className={buttonClasses({ className: "flex-1" })}
          >
            {t("buyAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
