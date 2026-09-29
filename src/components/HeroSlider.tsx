"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import { Sparkle } from "lucide-react";
import type { HomeSlide, Product } from "@/types";
import { Link } from "@/i18n/navigation";
import { HeroVideo } from "@/components/HeroVideo";

const AUTO_MS = 4500;
const ADDED_MS = 1500;

type Item = { kind: "promo"; slide: HomeSlide } | { kind: "product"; product: Product };

const isVideo = (item: Item | undefined) => item?.kind === "promo" && item.slide.mediaType === "video" && !!item.slide.videoUrl;

export function HeroSlider({ promo, products, isNew = false }: { promo: HomeSlide[]; products: Product[]; isNew?: boolean }) {
  const t = useTranslations("home");
  const price = usePrice();
  const text = useProductText();
  const { addItem } = useCart();
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  // Звук — один переключатель на все видео-слайды, по умолчанию выключен (иначе браузер не даст автоплей).
  const [muted, setMuted] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  // Видео, которые не запустились/не открылись: листаем их по обычному таймеру, иначе карусель встанет.
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());

  // Промо-слайды владельца идут первыми, затем товары.
  const items: Item[] = [
    ...promo.map((slide) => ({ kind: "promo" as const, slide })),
    ...products.map((product) => ({ kind: "product" as const, product })),
  ];
  const count = items.length;
  const current = items[index];
  const currentIsVideo = isVideo(current) && current?.kind === "promo" && !failedIds.has(current.slide.id);

  function markFailed(slideId: string) {
    setFailedIds((prev) => (prev.has(slideId) ? prev : new Set(prev).add(slideId)));
  }

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function goNext() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    goTo((Math.round(el.scrollLeft / el.clientWidth) + 1) % count);
  }

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function handleVideoEnded() {
    if (count > 1) {
      goNext();
      return;
    }
    // Единственный слайд — крутим ролик заново.
    const v = trackRef.current?.querySelector("video");
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  function handleAdd(e: React.MouseEvent, slideId: string, product: Product) {
    // Слайд — ссылка на товар: кнопка только кладёт в корзину.
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAddedId(slideId);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAddedId(null), ADDED_MS);
  }

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  // Таймер перезапускается на каждом слайде; пока на экране видео — не листаем, ждём ended.
  useEffect(() => {
    if (count < 2 || currentIsVideo) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || pausedRef.current || el.clientWidth === 0) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [count, currentIsVideo, index]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={() => (pausedRef.current = true)}
        onPointerUp={() => setTimeout(() => (pausedRef.current = false), 2500)}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-[var(--radius-card)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) =>
          item.kind === "promo" ? (
            <PromoSlide
              key={`promo-${item.slide.id}`}
              slide={item.slide}
              active={i === index}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onEnded={handleVideoEnded}
              onFailed={() => markFailed(item.slide.id)}
              added={addedId === item.slide.id}
              onAdd={handleAdd}
            />
          ) : (
            <Link
              key={item.product.id}
              href={`/product/${item.product.id}`}
              className="relative shrink-0 w-full snap-center aspect-[16/11] bg-accent-soft overflow-hidden"
            >
              {item.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.product.imageUrl} alt={text(item.product).name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkle className="size-14 text-accent/35" strokeWidth={1.2} aria-hidden />
                </div>
              )}
              {isNew && (
                <span className="absolute top-3 left-3 bg-accent text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full">
                  {t("newBadge")}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4 pb-9 text-white">
                <div className="text-[11px] uppercase tracking-wide text-white/80 font-medium mb-0.5">{item.product.brand}</div>
                <div className="font-display text-xl leading-snug line-clamp-2">{text(item.product).name}</div>
                <div className="mt-1 text-sm font-medium tabular-nums">{price(item.product.price)}</div>
              </div>
            </Link>
          ),
        )}
      </div>

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.kind === "promo" ? `promo-${item.slide.id}` : item.product.id}
            onClick={() => goTo(i)}
            aria-label={t("slide", { n: i + 1 })}
            className={["h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-white" : "w-1.5 bg-white/55"].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function PromoSlide({
  slide,
  active,
  muted,
  onToggleMute,
  onEnded,
  onFailed,
  added,
  onAdd,
}: {
  slide: HomeSlide;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onEnded: () => void;
  onFailed: () => void;
  added: boolean;
  onAdd: (e: React.MouseEvent, slideId: string, product: Product) => void;
}) {
  const t = useTranslations("home");
  const price = usePrice();
  const product = slide.action === "cart" ? slide.product : null;
  const href = product ? `/product/${product.id}` : "/catalog?promo=1";
  const hasText = !!slide.title || !!slide.subtitle;

  return (
    <Link href={href} className="relative shrink-0 w-full snap-center aspect-[16/11] bg-accent-soft overflow-hidden">
      {slide.mediaType === "video" && slide.videoUrl ? (
        <HeroVideo src={slide.videoUrl} poster={slide.imageUrl} active={active} muted={muted} onToggleMute={onToggleMute} onEnded={onEnded} onFailed={onFailed} />
      ) : slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.imageUrl} alt={slide.title ?? ""} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkle className="size-14 text-accent/35" strokeWidth={1.2} aria-hidden />
        </div>
      )}
      {/* Градиент — только под текстом или кнопкой, чистое фото/видео не затемняем. */}
      {(hasText || product) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-4 pb-9 text-white">
            {slide.title && <div className="font-display text-xl leading-snug line-clamp-2">{slide.title}</div>}
            {slide.subtitle && <div className="mt-0.5 text-sm text-white/85 line-clamp-2">{slide.subtitle}</div>}
            {product && (
              <button
                type="button"
                onClick={(e) => onAdd(e, slide.id, product)}
                className="mt-2.5 min-h-10 px-4 rounded-full bg-accent text-white text-sm font-semibold tabular-nums transition active:scale-95"
              >
                {added ? `${t("added")} ✓` : `${t("toCart")} · ${price(product.price)}`}
              </button>
            )}
          </div>
        </>
      )}
    </Link>
  );
}
