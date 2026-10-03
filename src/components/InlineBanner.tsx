"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroVideo } from "@/components/HeroVideo";
import { slideHref } from "@/lib/home-slides";
import type { HomeSlide } from "@/types";
import { useReservedBlock } from "@/lib/reserved-block";
import { Skeleton } from "@/components/ui/Skeleton";

/** Одиночный баннер в ленте главной (не попап). Пока грузится, при ошибке или без слайда — ничего. */
export function InlineBanner() {
  const t = useTranslations("home");
  const [slide, setSlide] = useState<HomeSlide | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reserve = useReservedBlock("inline-banner", !loaded ? "loading" : slide ? "present" : "absent");
  const [inView, setInView] = useState(false);
  // баннер близко к экрану: тогда создаём <video> (заранее, чтобы стартовал сразу), иначе — только обложка
  const [near, setNear] = useState(false);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/home-slides?placement=inline")
      .then((res) => (res.ok ? res.json() : { slides: [] }))
      .then((data: { slides: HomeSlide[] }) => setSlide(data.slides?.[0] ?? null))
      .catch(() => setSlide(null))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    const nearIo = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "0px 0px 700px 0px" });
    nearIo.observe(el);
    return () => {
      io.disconnect();
      nearIo.disconnect();
    };
  }, [slide]);

  // место под баннер, пока он грузится, — иначе «Популярные товары» съезжают вниз
  if (!slide) return reserve ? <Skeleton className="aspect-[16/9] rounded-[var(--radius-card)]" /> : null;
  const isVideo = slide.mediaType === "video" && !!slide.videoUrl;
  const hasText = !!(slide.title || slide.subtitle);

  return (
    <Link
      ref={ref}
      href={slideHref(slide)}
      className="relative block aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] bg-accent-soft"
    >
      {isVideo ? (
        <HeroVideo
          src={slide.videoUrl!}
          poster={slide.imageUrl}
          active={inView}
          mount={near || inView}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onFailed={() => {}}
          loop
        />
      ) : (
        slide.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.imageUrl} alt={slide.title ?? ""} className="absolute inset-0 w-full h-full object-cover" />
        )
      )}
      {/* Нижняя полоса: текст слева, видимый призыв справа. Ссылка — вся карточка, кнопка лишь подсказывает. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 pointer-events-none ${hasText ? "pt-10 bg-gradient-to-t from-black/60 to-transparent" : "justify-end"}`}
      >
        {hasText && (
          <div className="flex-1 min-w-0 text-white">
            {slide.title && <div className="font-display text-lg leading-tight">{slide.title}</div>}
            {slide.subtitle && <div className="text-sm mt-0.5 text-white/90">{slide.subtitle}</div>}
          </div>
        )}
        <span className="shrink-0 inline-flex h-9 items-center gap-1 rounded-full bg-accent px-3.5 text-sm font-medium text-white shadow-sm">
          {t("learnMore")}
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
