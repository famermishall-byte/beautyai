"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { Link } from "@/i18n/navigation";
import { wasAdShown, markAdShown, type AdPage } from "@/lib/session-flags";
import type { Banner } from "@/types";

/**
 * Всплывающий баннер: клик по карточке (не по крестику) ведёт на товар, а если баннер без
 * привязанного товара (законный случай — общая акция без конкретной позиции) — на «Акции».
 * `previewOnly` — только для предпросмотра в админке (BannerManager.tsx), пока форма ещё
 * черновик без сохранённого товара: там клик по недособранному баннеру никуда вести не должен.
 */
export function BannerInterstitial({ banner, onClose, previewOnly = false }: { banner: Banner; onClose: () => void; previewOnly?: boolean }) {
  const t = useTranslations("bannerInterstitial");
  const price = usePrice();

  const body = (
    <div className="tile-sheen relative w-full max-w-sm overflow-hidden rounded-sheet bg-card border border-border shadow-modal animate-rise-in">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("close")}
        className="absolute top-3 right-3 z-raised w-8 h-8 rounded-full bg-card/90 flex items-center justify-center shadow-control transition hover:scale-105 active:scale-90"
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
        <div className="rounded-full bg-accent text-on-accent px-4 py-3 text-sm font-medium text-center">
          {banner.buttonText || t("defaultCta")}
        </div>
      </div>
    </div>
  );

  if (previewOnly && !banner.productId) {
    // Предпросмотр без товара (форма ещё не сохранена) — не кликабельно.
    return (
      <div className="fixed inset-0 z-overlay flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onClose} />
        {body}
      </div>
    );
  }

  // Товара нет — ведём на общую страницу «Акции», а не никуда (баннер без товара всё равно
  // должен быть кликабелен для покупателя, раз в нём есть кнопка-призыв вроде «купи меня»).
  const href = banner.productId ? `/product/${banner.productId}` : "/catalog?promo=1";
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" onClick={onClose} />
      <Link href={href} onClick={onClose} className="contents">
        {body}
      </Link>
    </div>
  );
}

/** Монтируется на /, /catalog и /checkout — сам решает, показывать ли баннер (раз за посещение). */
export function BannerGate({ page }: { page: AdPage }) {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (wasAdShown(page)) return;
    let cancelled = false;
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: Banner[] }) => {
        if (cancelled) return;
        const top = (data.banners ?? [])[0];
        if (!top) return;
        Promise.resolve().then(() => {
          markAdShown(page);
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
