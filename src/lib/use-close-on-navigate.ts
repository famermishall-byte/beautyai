"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Для всплывающего окна со ссылкой на другой экран. Окно НЕ закрывается в момент нажатия: Safari на iPhone,
 * когда затемнение убирают в ту же долю секунды, что начинается переход, оставляет «призрак» серого слоя, пока не
 * нажмёшь на экран (жалоба владельца 04.10). Вместо этого окно закрывается, когда экран действительно сменился,
 * а если адрес страницы не изменился (ссылка на тот же экран) — запасным таймером.
 * Возвращает обработчик для `onClick` ссылки.
 */
export function useCloseOnNavigate(onClose: () => void, fallbackMs = 1500) {
  const pathname = usePathname();
  const startPath = useRef(pathname);
  const closeRef = useRef(onClose);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (pathname !== startPath.current) closeRef.current();
  }, [pathname]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => closeRef.current(), fallbackMs);
  };
}
