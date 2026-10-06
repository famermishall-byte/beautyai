"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
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
const MIN_SPLASH_MS = 2600;

export function AppSplashGate({
  children,
  initialAlreadyShown,
}: {
  children: ReactNode;
  initialAlreadyShown: boolean;
}) {
  const { loading } = useSession();
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
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#c9164d] px-6 transition-opacity duration-500 ${
          showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <AnimatedLogo />
      </div>
      <div className={showSplash ? "invisible" : "visible"}>{children}</div>
    </>
  );
}
