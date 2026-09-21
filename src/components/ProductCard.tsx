"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { Heart, Plus, Check, Sparkle } from "lucide-react";
import type { Product, RecommendedProduct } from "@/types";
import { useCart } from "@/lib/cart-context";
import { useMyBag } from "@/lib/mybag-context";
import { LOW_STOCK_MAX } from "@/lib/stock";
import { Link } from "@/i18n/navigation";

export function ProductCard({ product }: { product: Product | RecommendedProduct }) {
  const t = useTranslations("product");
  const price = usePrice();
  const text = useProductText();
  const productName = text(product).name;
  const { addItem } = useCart();
  const { toggle, isSaved } = useMyBag();
  const [justAdded, setJustAdded] = useState(false);
  const reason = "reason" in product ? product.reason : null;
  const saved = isSaved(product.id);
  const outOfStock = product.branchQuantity === 0;
  const oldPrice = product.attributes?.oldPrice;
  const discount = oldPrice && oldPrice > product.price ? Math.round((1 - product.price / oldPrice) * 100) : 0;
  const isHit = Boolean(product.attributes?.hit);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  function handleToggleSaved(e: React.MouseEvent) {
    e.preventDefault();
    toggle(product);
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="group bg-card rounded-[var(--radius-card)] border border-border overflow-hidden flex flex-col transition-all duration-200 hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[4/5] bg-accent-soft overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkle className="size-9 text-accent/35" strokeWidth={1.4} aria-hidden />
          </div>
        )}

        {(discount > 0 || isHit) && (
          <div className="absolute top-0 left-0 flex flex-col text-[11px] font-bold text-white leading-none">
            {discount > 0 && <span className="bg-[#f470b4] px-2 py-1.5 rounded-br-md">-{discount}%</span>}
            {isHit && <span className="bg-[#7fcf50] px-2 py-1.5 rounded-br-md">{t("hit")}</span>}
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 bg-foreground/75 backdrop-blur-sm text-white text-[11px] font-medium text-center py-1.5">
            {t("outOfStock")}
          </div>
        )}

        <button
          onClick={handleToggleSaved}
          aria-label={saved ? t("removeFromBag") : t("saveToBag")}
          aria-pressed={saved}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Heart
            className={["size-4.5 transition-colors", saved ? "animate-pop text-accent" : "text-foreground/60"].join(" ")}
            strokeWidth={2}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted font-medium truncate">{product.brand}</div>
        <h3 className="font-display text-[15px] leading-snug line-clamp-2 min-h-[2.5em]">{productName}</h3>

        {reason && (
          <div className="text-xs bg-accent-soft text-accent-strong rounded-lg px-2.5 py-1.5 mt-0.5 w-fit">{reason}</div>
        )}

        {product.branchQuantity !== undefined && product.branchQuantity !== null && product.branchQuantity > 0 && (
          <div className={["text-[11px] font-medium", product.branchQuantity <= LOW_STOCK_MAX ? "text-warning" : "text-success"].join(" ")}>
            {product.branchQuantity <= LOW_STOCK_MAX ? t("lowStock") : t("inStock")}
          </div>
        )}
        {product.branchQuantity === 0 && product.availableAtOtherBranch && (
          <div className="text-[11px] text-muted">{t("otherBranch")}</div>
        )}

        <div className="mt-auto pt-2.5 flex items-end justify-between gap-2">
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg tabular-nums">{price(product.price)}</span>
            {discount > 0 && oldPrice && (
              <span className="text-xs text-muted line-through tabular-nums">{price(oldPrice)}</span>
            )}
          </span>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={t("addToCartNamed", { name: productName })}
            className={[
              "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              "disabled:bg-border disabled:text-muted disabled:pointer-events-none",
              justAdded ? "bg-success text-white" : "bg-accent text-white hover:bg-accent-strong active:scale-90",
            ].join(" ")}
          >
            {justAdded ? (
              <Check className="size-4.5" strokeWidth={2.5} aria-hidden />
            ) : (
              <Plus className="size-4.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
