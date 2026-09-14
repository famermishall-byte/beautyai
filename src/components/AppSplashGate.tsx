"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/session-context";

const MIN_SPLASH_MS = 900;

export function AppSplashGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const showSplash = loading || !minTimeElapsed;

  return (
    <>
      <div
        aria-hidden={!showSplash}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-500 ${
          showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="animate-splash-in text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-display text-white shadow-lg shadow-accent/30">
            {(session?.storeName || "B").charAt(0)}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            {session?.storeName || "BeautyAI"}
          </h1>
          <p className="text-muted mt-2">Добро пожаловать!</p>
        </div>
      </div>
      <div className={showSplash ? "invisible" : "visible"}>{children}</div>
    </>
  );
}
