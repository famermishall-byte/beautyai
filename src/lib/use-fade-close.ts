"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Всплывающее окно закрывается не мгновенно, а сначала плавно гаснет (`closing` → прозрачность 0), и только потом
 * `onClose` убирает его. Safari на iPhone, когда убирают окно с бегущим бликом посреди анимации, оставляет на экране
 * «залипший» серый слой (жалоба владельца 04.10, окно акции с аромасаше). Прозрачный последний кадр этого не оставляет.
 */
export function useFadeClose(onClose: () => void, ms = 220) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => closeRef.current(), ms);
  }, [ms]);

  return { closing, requestClose };
}

/** Классы корня окна: плавное гашение и нет нажатий, пока окно гаснет. */
export function fadeClasses(closing: boolean): string {
  return `transition-opacity duration-200 ${closing ? "opacity-0 pointer-events-none" : "opacity-100"}`;
}
