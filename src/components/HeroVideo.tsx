"use client";

import { useEffect, useEffectEvent, useRef } from "react";
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
  onFailed,
  loop = false,
}: {
  src: string;
  poster: string | null;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onEnded?: () => void;
  /** Ролик не запустился (play() отклонён) или не открылся (ошибка загрузки/кодека). */
  onFailed: () => void;
  /** Зацикленный ролик (инлайн-баннер); у слайдера false — иначе нет события ended. */
  loop?: boolean;
}) {
  const t = useTranslations("home");
  const ref = useRef<HTMLVideoElement>(null);

  // AbortError — play() прерван нашим же pause() при перелистывании, это не поломка.
  function reportIfFailed(err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    onFailed();
  }
  const onPlayRejected = useEffectEvent(reportIfFailed);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      // Автоплей может быть запрещён (iOS энергосбережение) — остаётся постер, слайдер листает по таймеру.
      v.play().catch(onPlayRejected);
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
        loop={loop}
        preload="metadata"
        onEnded={onEnded}
        onError={onFailed}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={(e) => {
          // Слайд — это ссылка: клик по кнопке звука не должен открывать товар.
          e.preventDefault();
          e.stopPropagation();
          onToggleMute();
          // Тап — пользовательский жест: запускаем ролик, если автоплей был заблокирован.
          const v = ref.current;
          if (v?.paused) v.play().catch(reportIfFailed);
        }}
        aria-label={muted ? t("soundOn") : t("soundOff")}
        className="absolute top-3 right-3 z-10 size-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition active:scale-95"
      >
        {muted ? <VolumeX className="size-4.5" strokeWidth={2} aria-hidden /> : <Volume2 className="size-4.5" strokeWidth={2} aria-hidden />}
      </button>
    </>
  );
}
