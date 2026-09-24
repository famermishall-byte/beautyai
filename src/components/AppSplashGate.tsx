"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-context";
import { SPLASH_COOKIE } from "@/lib/splash-cookie";

// Раньше здесь была статичная заставка (иконка в квадратике + название) — владелец попросил
// 24.09 сделать её такой же красивой, как анимация после первой регистрации (кольца + лого +
// текст, ранее жила только в LogoIntro.tsx/FirstRunFlow.tsx, показывалась один раз за аккаунт).
// Теперь этот же стиль — здесь, при каждом РЕАЛЬНОМ открытии приложения — не на внутренних
// переходах между страницами и не на обновлении (F5/pull-to-refresh). Решение «показывать или
// нет» принимает СЕРВЕР — читает cookie в layout.tsx (см. splash-cookie.ts) и передаёт готовый
// initialAlreadyShown сюда. Раньше это решалось на клиенте (localStorage + Navigation Timing
// API) уже ПОСЛЕ первой отрисовки — на телефоне, где JS гидратируется заметно медленнее, чем на
// компьютере, заставка успевала мелькнуть даже на обычном обновлении, пока клиентский эффект её
// не спрятал (жалоба владельца, 24.09: «раньше не выходил, а сейчас выходит»). Раз решение готово
// уже в SSR-разметке, скрывать нечего — её просто не рисует ни один рендер.
const MIN_SPLASH_MS = 1200;

export function AppSplashGate({
  children,
  initialAlreadyShown,
}: {
  children: ReactNode;
  initialAlreadyShown: boolean;
}) {
  const t = useTranslations("intro");
  const tMeta = useTranslations("meta");
  const { session, loading } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [alreadyShown, setAlreadyShown] = useState(initialAlreadyShown);

  useEffect(() => {
    if (alreadyShown) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (alreadyShown || loading || !minTimeElapsed) return;
    const maxAgeSeconds = 60 * 60 * 24 * 365;
    document.cookie = `${SPLASH_COOKIE}=${Date.now()};path=/;max-age=${maxAgeSeconds};samesite=lax`;
    Promise.resolve().then(() => setAlreadyShown(true));
  }, [alreadyShown, loading, minTimeElapsed]);

  const showSplash = !alreadyShown && (loading || !minTimeElapsed);

  return (
    <>
      <div
        aria-hidden={!showSplash}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-accent text-white px-6 transition-opacity duration-500 ${
          showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative w-32 h-32 flex items-center justify-center mb-7">
          <span className="intro-ring absolute inset-0 rounded-full border-2 border-white/60" aria-hidden />
          <span
            className="intro-ring absolute inset-0 rounded-full border-2 border-white/60"
            style={{ animationDelay: "1.1s" }}
            aria-hidden
          />
          <Image src="/icon-512.png" alt="" width={128} height={128} priority className="intro-logo relative rounded-full" />
        </div>
        <h1
          className="intro-text font-display text-2xl sm:text-3xl text-center leading-tight"
          style={{ animationDelay: "0.15s" }}
        >
          {session?.storeName || tMeta("title")}
        </h1>
        <p className="intro-text text-white/75 text-sm mt-2 text-center" style={{ animationDelay: "0.3s" }}>
          {t("tagline")}
        </p>
      </div>
      <div className={showSplash ? "invisible" : "visible"}>{children}</div>
    </>
  );
}
