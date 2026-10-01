"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroVideo } from "@/components/HeroVideo";
import { slideHref } from "@/lib/home-slides";
import type { HomeSlide } from "@/types";

/** Одиночный баннер в ленте главной (не попап). Пока грузится, при ошибке или без слайда — ничего. */
export function InlineBanner() {
  const t = useTranslations("home");
  const [slide, setSlide] = useState<HomeSlide | null>(null);
  const [inView, setInView] = useState(false);
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/home-slides?placement=inline")
      .then((res) => (res.ok ? res.json() : { slides: [] }))
      .then((data: { slides: HomeSlide[] }) => setSlide(data.slides?.[0] ?? null))
      .catch(() => setSlide(null));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [slide]);

  if (!slide) return null;
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
