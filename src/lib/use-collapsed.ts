"use client";

import { useEffect, useState } from "react";

/**
 * Свёрнут ли блок профиля («Моя анкета», «Ваш набор»). Выбор запоминается на этом телефоне, чтобы не листать вниз
 * каждый раз (просьба владельца 29.09). Хранилище может быть недоступно — тогда просто без запоминания.
 */
export function useCollapsed(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const storageKey = `beautyai-collapsed:${key}`;
  const [collapsed, setCollapsedState] = useState(initial);

  useEffect(() => {
    // Read after mount (SSR has no localStorage) — same rationale as getStoredCity in profile/page.tsx.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {
      // недоступно — остаётся значение по умолчанию
    }
    if (stored === "1" || stored === "0") Promise.resolve().then(() => setCollapsedState(stored === "1"));
  }, [storageKey]);

  function setCollapsed(value: boolean) {
    setCollapsedState(value);
    try {
      localStorage.setItem(storageKey, value ? "1" : "0");
    } catch {
      // недоступно — выбор просто не запомнится
    }
  }

  return [collapsed, setCollapsed];
}
