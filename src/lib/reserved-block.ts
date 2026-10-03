"use client";

import { useEffect, useSyncExternalStore } from "react";

// Блоки, которые появляются только после ответа сервера (плашка опта, баннер главной, строка филиалов),
// сдвигали всё, что ниже, — экран «прыгал». Пока блок грузится, под него держится место; был ли блок
// в прошлый раз, помнит этот телефон — тогда место не резервируется зря (и наоборот).

export type BlockState = "loading" | "present" | "absent";

const PREFIX = "beautyai-block-";
const noSubscribe = () => () => {};

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null; // хранилище недоступно — считаем, что ничего не помним
  }
}

/**
 * Держать ли место под блок, пока он грузится.
 * `reserveWhenUnknown` — что делать при первом заходе, когда о блоке ещё ничего не известно.
 */
export function useReservedBlock(key: string, state: BlockState, reserveWhenUnknown = true): boolean {
  // На сервере и в первый кадр «не помним» — без расхождения с тем, что отрисовал сервер.
  const remembered = useSyncExternalStore(noSubscribe, () => read(key), () => null);

  useEffect(() => {
    if (state === "loading") return;
    try {
      localStorage.setItem(PREFIX + key, state);
    } catch {
      // недоступно — в следующий раз просто не будем помнить
    }
  }, [key, state]);

  if (state !== "loading") return false;
  if (remembered === "present") return true;
  if (remembered === "absent") return false;
  return reserveWhenUnknown;
}
