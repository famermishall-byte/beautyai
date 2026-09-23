"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/session-context";
import { BrandMark } from "@/components/BrandMark";
import { wasSplashShown, markSplashShown } from "@/lib/session-flags";

const MIN_SPLASH_MS = 900;

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
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-500 ${
          showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="animate-splash-in text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30">
            <BrandMark size={30} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            {session?.storeName || tMeta("title")}
          </h1>
          <p className="text-muted mt-2">{t("welcome")}</p>
        </div>
      </div>
      <div className={showSplash ? "invisible" : "visible"}>{children}</div>
    </>
  );
}
