"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { Link } from "@/i18n/navigation";
import { wasPromoAdShown, markPromoAdShown, type PromoAdPage } from "@/lib/session-flags";
import type { Product } from "@/types";

/**
 * Всплывающее окно про активную акцию (скидку на товар) — отдельное от BannerInterstitial
 * (тот про баннеры, этот про /api/promotions), но того же вида/поведения: клик по карточке
 * ведёт на товар, крестик закрывает.
 */
export function PromotionInterstitial({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useTranslations("promotionInterstitial");
  const price = usePrice();
  const text = useProductText();
  const oldPrice = product.attributes?.oldPrice;
  const discount = oldPrice && oldPrice > product.price ? Math.round((1 - product.price / oldPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} />
      <Link href={`/product/${product.id}`} onClick={onClose} className="contents">
        <div className="tile-sheen relative w-full max-w-sm overflow-hidden rounded-[28px] bg-card border border-black/5 shadow-xl animate-rise-in">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label={t("close")}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-90"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>

          {discount > 0 && (
            <div className="absolute top-3 left-3 z-10 bg-[#f470b4] text-white text-sm font-bold px-3 py-1.5 rounded-full">
              -{discount}%
            </div>
          )}

          {product.imageUrl && (
            <div className="relative aspect-[16/11] bg-accent-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-5">
            <div className="text-xs uppercase tracking-wide text-accent font-medium mb-1">{t("title")}</div>
            <div className="font-display text-xl leading-snug mb-3">{text(product).name}</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-2xl">{price(product.price)}</span>
              {oldPrice && oldPrice > product.price && (
                <span className="text-sm text-muted line-through">{price(oldPrice)}</span>
              )}
            </div>
            <div className="rounded-full bg-accent text-white px-4 py-3 text-sm font-medium text-center">
              {t("defaultCta")}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Монтируется на / и /catalog — сам решает, показывать ли акцию (раз за посещение). */
export function PromotionGate({ page }: { page: PromoAdPage }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (wasPromoAdShown(page)) return;
    let cancelled = false;
    fetch("/api/promotions")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        if (cancelled) return;
        const top = (data.products ?? [])[0];
        if (!top) return;
        Promise.resolve().then(() => {
          markPromoAdShown(page);
          setProduct(top);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (!product) return null;
  return <PromotionInterstitial product={product} onClose={() => setProduct(null)} />;
}
