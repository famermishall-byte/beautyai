"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";

/** Видео-слайд верхнего слайдера: играет только когда слайд на экране; без loop — иначе нет события ended. */
export function HeroVideo({
  src,
  poster,
  active,
  muted,
  onToggleMute,
  onEnded,
}: {
  src: string;
  poster: string | null;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onEnded: () => void;
}) {
  const t = useTranslations("home");
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      // Автоплей может быть запрещён браузером — тогда просто остаётся постер.
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        playsInline
        preload="metadata"
        onEnded={onEnded}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={(e) => {
          // Слайд — это ссылка: клик по кнопке звука не должен открывать товар.
          e.preventDefault();
          e.stopPropagation();
          onToggleMute();
        }}
        aria-label={muted ? t("soundOn") : t("soundOff")}
        className="absolute top-3 right-3 z-10 size-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-95"
      >
        {muted ? <VolumeX className="size-4.5" strokeWidth={2} aria-hidden /> : <Volume2 className="size-4.5" strokeWidth={2} aria-hidden />}
      </button>
    </>
  );
}
