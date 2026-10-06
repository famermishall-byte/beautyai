"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

const TRIGGER = 70; // сколько пикселей нужно потянуть, чтобы обновилось
const MAX_PULL = 110;

/** Ближайший родитель с собственной вертикальной прокруткой, уже прокрученный вниз, — тянуть страницу тогда нельзя. */
function insideScrolledArea(target: EventTarget | null, root: HTMLElement) {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== root && el !== document.documentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * iPhone, приложение с иконки «Домой»: встроенного «потяни, чтобы обновить» там нет (оно есть только в Safari),
 * а `overscroll-behavior: none` у оболочки (`html.ios-shell`) не даёт и резинового отскока. Поэтому жест делаем сами:
 * работает только в этом режиме (`navigator.standalone`), только когда внутренняя область прокручена до самого верха.
 */
export function IosPullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);

  useEffect(() => {
    if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return;
    const scroller = document.body;
    let startY = 0;
    let startX = 0;
    let tracking = false;

    const set = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onStart = (e: TouchEvent) => {
      tracking = false;
      if (e.touches.length !== 1 || scroller.scrollTop > 0) return;
      if (insideScrolledArea(e.target, scroller)) return;
      if (e.target instanceof Element && e.target.closest("[role='dialog'], input, textarea, select")) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      tracking = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (dy <= 0 || scroller.scrollTop > 0 || dx > dy) {
        if (pullRef.current) set(0);
        if (dy <= 0 || dx > dy) tracking = false;
        return;
      }
      set(Math.min(MAX_PULL, dy * 0.5));
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (pullRef.current >= TRIGGER * 0.5 + 10) {
        setRefreshing(true);
        window.location.reload();
      } else {
        set(0);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;
  const ready = pull >= TRIGGER * 0.5 + 10;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 z-[200] flex justify-center"
      style={{ top: "env(safe-area-inset-top)", transform: `translateY(${refreshing ? 24 : pull - 20}px)` }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent shadow-md">
        <RotateCw
          size={18}
          className={refreshing ? "animate-spin" : undefined}
          style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)`, opacity: ready ? 1 : 0.6 }}
        />
      </span>
    </div>
  );
}
