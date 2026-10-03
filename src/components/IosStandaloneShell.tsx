"use client";

import { useEffect } from "react";

/**
 * iPhone, приложение с иконки «Домой» (iOS 26.0.1, жалоба владельца 04.10): когда прокручивается вся страница, браузер
 * сдвигает видимую область (`visualViewport.offsetTop`), и прикреплённое к низу меню остаётся выше края экрана —
 * iOS не рисует закреплённые элементы в нижней полосе. Замер владельца на тестовой копии: если страница сама не
 * прокручивается, а прокручивается внутренняя область (`body`), меню стоит у края (правила — `html.ios-shell` в globals.css).
 * Включаем только в режиме «Домой» на iPhone (`navigator.standalone`): в Safari, на Android и на компьютере ничего не меняется.
 */
export function IosStandaloneShell() {
  useEffect(() => {
    if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return;
    const root = document.documentElement;
    root.classList.add("ios-shell");
    return () => root.classList.remove("ios-shell");
  }, []);
  return null;
}
