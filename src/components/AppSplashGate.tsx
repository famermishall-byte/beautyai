"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-context";
import { wasSplashShown, markSplashShown } from "@/lib/session-flags";

// Раньше здесь была статичная заставка (иконка в квадратике + название) — владелец
// попросил 24.09 сделать её такой же красивой, как анимация после первой регистрации
// (кольца + лого + текст, ранее жила только в LogoIntro.tsx/FirstRunFlow.tsx, показывалась
// один раз за аккаунт). Теперь этот же стиль — здесь, при КАЖДОМ открытии приложения
// (заставка и так уже держится один раз за вкладку/заход, см. session-flags.ts), поэтому
// отдельный одноразовый LogoIntro.tsx убран, чтобы не показывать одну и ту же анимацию
// дважды подряд сразу после регистрации.
const MIN_SPLASH_MS = 1200;

export function AppSplashGate({ children }: { children: ReactNode }) {
  const t = useTranslations("intro");
  const tMeta = useTranslations("meta");
  const { session, loading } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  // Раньше это была ЕДИНСТВЕННАЯ причина, по которой заставка держалась минимум 900 мс всегда,
  // даже когда сессия уже загрузилась мгновенно — на каждом обновлении любой страницы.
  // sessionStorage недоступен при рендере/SSR — читаем только в эффекте (тот же приём, что и
  // везде в session-flags.ts), поэтому alreadyShown стартует false и корректируется сразу после
  // монтирования, до того как истечёт MIN_SPLASH_MS.
  const [alreadyShown, setAlreadyShown] = useState(false);

  useEffect(() => {
    if (wasSplashShown()) {
      Promise.resolve().then(() => setAlreadyShown(true));
      return;
    }
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) markSplashShown();
  }, [loading, minTimeElapsed]);

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
