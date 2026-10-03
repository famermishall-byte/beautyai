"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
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
  mount = true,
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
  /** Создавать <video> только когда он нужен: iPhone в режиме «Домой» не тянет несколько роликов сразу (видео зависает на нуле). Иначе — обложка. */
  mount?: boolean;
}) {
  const t = useTranslations("home");
  const ref = useRef<HTMLVideoElement>(null);
  // ТЕСТ (ветка ios-nav-fix): журнал событий видео поверх ролика — чтобы увидеть, почему оно не играет в приложении с иконки
  const [dbg, setDbg] = useState<string[]>([]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const t0 = performance.now();
    const add = (m: string) => setDbg((d) => [...d.slice(-7), `${((performance.now() - t0) / 1000).toFixed(1)}s ${m}`]);
    const names = ["loadstart", "loadedmetadata", "loadeddata", "canplay", "playing", "pause", "waiting", "stalled", "suspend", "abort", "emptied", "ended"];
    const handlers = names.map((n) => {
      const h = () => add(`${n} rs${v.readyState} ns${v.networkState}`);
      v.addEventListener(n, h);
      return [n, h] as const;
    });
    const onErr = () => add(`ERROR code ${v.error?.code} ${v.error?.message ?? ""}`.slice(0, 80));
    v.addEventListener("error", onErr);
    add(`init muted=${v.muted} paused=${v.paused} rs${v.readyState} ns${v.networkState}`);
    const timer = setInterval(() => add(`tick t=${v.currentTime.toFixed(1)} paused=${v.paused} rs${v.readyState} ns${v.networkState}`), 3000);
    return () => {
      for (const [n, h] of handlers) v.removeEventListener(n, h);
      v.removeEventListener("error", onErr);
      clearInterval(timer);
    };
  }, [mount]);

  // AbortError — play() прерван нашим же pause() при перелистывании, это не поломка.
  function reportIfFailed(err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    onFailed();
  }
  const onPlayRejected = useEffectEvent(reportIfFailed);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!active) {
      v.pause();
      v.currentTime = 0;
      return;
    }
    // Автоплей может быть запрещён — остаётся постер, слайдер листает по таймеру.
    setDbg((d) => [...d.slice(-7), `play() вызван active, muted=${v.muted}`]);
    v.play().then(
      () => setDbg((d) => [...d.slice(-7), "play() OK"]),
      (e: unknown) => {
        setDbg((d) => [...d.slice(-7), `play() ОТКАЗ ${e instanceof DOMException ? e.name : String(e)}`.slice(0, 80)]);
        onPlayRejected(e);
      },
    );
    // Страховка для iPhone в режиме «Домой»: ролик «играет», а время стоит на нуле (не хватило видеодекодера) — перезапускаем.
    const watchdog = setTimeout(() => {
      if (!v.paused && v.currentTime < 0.05) {
        setDbg((d) => [...d.slice(-7), "WATCHDOG: время 0, перезапуск"]);
        v.load();
        v.play().catch(onPlayRejected);
      }
    }, 2500);
    return () => clearTimeout(watchdog);
  }, [active, mount]);

  return (
    <>
      {mount ? (
        <video
          ref={ref}
          src={src}
          poster={poster ?? undefined}
          muted={muted}
          playsInline
          loop={loop}
          // ролики сжаты до 0,4–0,6 МБ, поэтому грузим заранее: слайд стартует сразу (с "none" задержка 0,4–1,3 с и больше)
          preload="auto"
          onEnded={onEnded}
          onError={onFailed}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      )}
      <div className="absolute left-1 top-1 z-20 max-w-[92%] rounded bg-black/75 p-1 font-mono text-[9px] leading-tight text-white pointer-events-none">
        {dbg.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
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
