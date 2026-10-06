"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useSession } from "@/lib/session-context";
import {
  ACTIVE_COOKIE,
  ACTIVE_REFRESH_MS,
  ACTIVE_TTL_SECONDS,
  RESUME_GAP_MS,
  SPLASH_FORCE_COOKIE,
} from "@/lib/splash-cookie";

// Заставка с анимированным логотипом. Когда показывать — правило владельца (06.10), подробности в splash-cookie.ts:
// только при открытии приложения клиентом (в том числе первый раз после регистрации) и при переходе из админки в
// магазин; не на обновлении страницы и не на переходах. Решение «показывать ли» принимает СЕРВЕР (layout.tsx) и
// передаёт сюда готовое initialAlreadyShown — раньше это решалось на клиенте уже после первой отрисовки, и на
// телефоне заставка успевала мелькнуть даже на обновлении (жалоба владельца, 24.09). Здесь же клиент поддерживает
// «метку активности» и заново играет заставку, если установленное приложение свернули надолго и вернулись.
const MIN_SPLASH_MS = 4600;

function isInstalledApp(): boolean {
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    w.Capacitor?.isNativePlatform?.() === true
  );
}

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
  const [playId, setPlayId] = useState(0);

  // Пока заставка на экране — минимальное время показа, чтобы анимация доиграла.
  useEffect(() => {
    if (alreadyShown) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [alreadyShown, playId]);

  useEffect(() => {
    if (alreadyShown || loading || !minTimeElapsed) return;
    Promise.resolve().then(() => setAlreadyShown(true));
  }, [alreadyShown, loading, minTimeElapsed]);

  // «Метка активности»: пока приложение открыто — обновляем её; закрыли — через ACTIVE_TTL_SECONDS она исчезнет,
  // и следующая загрузка будет считаться открытием приложения. Обновление страницы метку не стирает.
  useEffect(() => {
    const touch = () => {
      document.cookie = `${ACTIVE_COOKIE}=1;path=/;max-age=${ACTIVE_TTL_SECONDS};samesite=lax`;
    };
    touch();
    // Просьба «покажи заставку» (переход из админки в магазин) уже выполнена сервером — сбрасываем.
    document.cookie = `${SPLASH_FORCE_COOKIE}=;path=/;max-age=0;samesite=lax`;

    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        touch();
        return;
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      touch();
      // Свёрнутое установленное приложение, в которое вернулись через много минут, — как новое открытие.
      if (away > RESUME_GAP_MS && isInstalledApp()) {
        setMinTimeElapsed(false);
        setAlreadyShown(false);
        setPlayId((n) => n + 1);
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") touch();
    }, ACTIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", touch);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", touch);
    };
  }, []);

  const showSplash = !alreadyShown && (loading || !minTimeElapsed);

  return (
    <>
      <div
        aria-hidden={!showSplash}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#c9164d] px-6 transition-opacity duration-500 ${
          showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <AnimatedLogo key={playId} />
      </div>
      <div className={showSplash ? "invisible" : "visible"}>{children}</div>
    </>
  );
}
