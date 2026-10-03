"use client";

import { useEffect } from "react";

/**
 * iOS 26, приложение с иконки «Домой» (жалоба владельца 04.10): после прокрутки видимая область экрана смещается
 * внутри окна (`visualViewport.offsetTop` = 59,3), а прикреплённые к низу элементы остаются на месте, и под нижним
 * меню появляется полоса ровно такой высоты (замер на её iPhone: разрыв 59,3 при offsetTop 59,3).
 * Записываем сдвиг в `--vv-shift`, а нижние элементы вычитают его из своего `bottom`.
 * Работает только в режиме «Домой» на iPhone (`navigator.standalone`): в обычном браузере и на Android ничего не меняется.
 */
export function useVisualViewportShift() {
  useEffect(() => {
    const vv = window.visualViewport;
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!vv || !standalone) return;

    const root = document.documentElement;
    let last = -1;
    let frame = 0;

    const apply = () => {
      frame = 0;
      // не меньше 0 (резиновая прокрутка сверху даёт отрицательное) и не больше разумного предела
      const value = Math.min(120, Math.max(0, Math.round(vv.offsetTop * 2) / 2));
      if (value === last) return;
      last = value;
      root.style.setProperty("--vv-shift", `${value}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("scroll", schedule);
    vv.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener("scroll", schedule);
      vv.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      root.style.removeProperty("--vv-shift");
    };
  }, []);
}
