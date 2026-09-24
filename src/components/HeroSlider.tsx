"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { Sparkle } from "lucide-react";
import type { Product } from "@/types";
import { Link } from "@/i18n/navigation";

const AUTO_MS = 4500;

export function HeroSlider({ products, isNew = false }: { products: Product[]; isNew?: boolean }) {
  const t = useTranslations("home");
  const price = usePrice();
  const text = useProductText();
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  useEffect(() => {
    if (products.length < 2) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || pausedRef.current) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % products.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [products.length]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={() => (pausedRef.current = true)}
        onPointerUp={() => setTimeout(() => (pausedRef.current = false), 2500)}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-[var(--radius-card)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="relative shrink-0 w-full snap-center aspect-[16/11] bg-accent-soft overflow-hidden"
          >
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={text(p).name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkle className="size-14 text-accent/35" strokeWidth={1.2} aria-hidden />
              </div>
            )}
            {isNew && (
              <span className="absolute top-3 left-3 bg-[#3b82f6] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full">
                {t("newBadge")}
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-4 pb-9 text-white">
              <div className="text-[11px] uppercase tracking-wide text-white/80 font-medium mb-0.5">{p.brand}</div>
              <div className="font-display text-xl leading-snug line-clamp-2">{text(p).name}</div>
              <div className="mt-1 text-sm font-medium tabular-nums">{price(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
        {products.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goTo(i)}
            aria-label={t("slide", { n: i + 1 })}
            className={["h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-white" : "w-1.5 bg-white/55"].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
