"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { Link } from "@/i18n/navigation";
import { wasCatalogAdShown, markCatalogAdShown, wasCheckoutAdShown, markCheckoutAdShown } from "@/lib/session-flags";
import type { Banner } from "@/types";

/** Всплывающий баннер: клик по карточке (не по крестику) ведёт на товар. */
export function BannerInterstitial({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const t = useTranslations("bannerInterstitial");
  const price = usePrice();

  const body = (
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

      {banner.imageUrl && (
        <div className="relative aspect-[16/11] bg-accent-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-5">
        <div className="font-display text-xl leading-snug mb-1">{banner.title}</div>
        {banner.subtitle && <p className="text-sm text-muted mb-3">{banner.subtitle}</p>}
        {banner.product && (
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted truncate">{banner.product.name}</span>
            <span className="font-display text-foreground shrink-0 ml-2">{price(banner.product.price)}</span>
          </div>
        )}
        <div className="rounded-full bg-accent text-white px-4 py-3 text-sm font-medium text-center">
          {banner.buttonText || t("defaultCta")}
        </div>
      </div>
    </div>
  );

  if (!banner.productId) {
    // Предпросмотр без товара (форма ещё не сохранена) — не кликабельно.
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} />
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={onClose} />
      <Link href={`/product/${banner.productId}`} onClick={onClose} className="contents">
        {body}
      </Link>
    </div>
  );
}

/** Монтируется на /catalog и /checkout — сам решает, показывать ли баннер (раз за посещение). */
export function BannerGate({ page }: { page: "catalog" | "checkout" }) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const wasShown = page === "catalog" ? wasCatalogAdShown() : wasCheckoutAdShown();
    if (wasShown) return;
    let cancelled = false;
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: Banner[] }) => {
        if (cancelled) return;
        const top = (data.banners ?? [])[0];
        if (!top) return;
        Promise.resolve().then(() => {
          if (page === "catalog") markCatalogAdShown();
          else markCheckoutAdShown();
          setBanner(top);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (!banner) return null;
  return <BannerInterstitial banner={banner} onClose={() => setBanner(null)} />;
}
