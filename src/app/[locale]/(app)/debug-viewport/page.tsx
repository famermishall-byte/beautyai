"use client";

import { useEffect, useRef, useState } from "react";

// ВРЕМЕННАЯ страница диагностики экрана iPhone (04.10.2026): полоса под нижним меню в приложении с иконки «Домой».
// Показывает размеры, которые сообщает браузер, и даёт кнопками включать/выключать возможные причины прямо на телефоне.
// Удалить после исправления.
type Info = Record<string, string>;

const VIEWPORT_WITH_MAX_SCALE = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";
const VIEWPORT_WITHOUT_MAX_SCALE = "width=device-width, initial-scale=1, viewport-fit=cover";

function measure(): Info {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const safeTop = cs.paddingTop;
  const safeBottom = cs.paddingBottom;
  probe.remove();

  const nav = document.querySelector("nav.fixed") as HTMLElement | null;
  const navRect = nav?.getBoundingClientRect();
  const vv = window.visualViewport;
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const r = (n: number | undefined) => (n === undefined ? "—" : String(Math.round(n * 10) / 10));
  return {
    "режим «Домой» (standalone)": standalone ? "да" : "нет",
    "window.innerHeight": r(window.innerHeight),
    "screen.height": r(screen.height),
    "visualViewport.height": r(vv?.height),
    "visualViewport.offsetTop": r(vv?.offsetTop),
    "safe-area top / bottom": `${safeTop} / ${safeBottom}`,
    "нижнее меню: верх / низ": navRect ? `${r(navRect.top)} / ${r(navRect.bottom)}` : "меню не найдено",
    "высота меню": r(navRect?.height),
    "РАЗРЫВ под меню (innerHeight − низ меню)": navRect ? r(window.innerHeight - navRect.bottom) : "—",
    "прокрутка (scrollY)": r(window.scrollY),
  };
}

// D: нижнее меню не «fixed», а «sticky» внизу страницы (лежит в прокручиваемой области, а не в закреплённом слое)
function applySticky(on: boolean) {
  const nav = document.querySelector("nav.fixed, nav[data-dbg-sticky]") as HTMLElement | null;
  if (!nav) return;
  if (on) {
    nav.setAttribute("data-dbg-sticky", "1");
    nav.style.setProperty("position", "sticky");
    nav.style.setProperty("bottom", "0px");
  } else {
    nav.removeAttribute("data-dbg-sticky");
    nav.style.removeProperty("position");
    nav.style.setProperty("bottom", "calc(-1 * var(--vv-shift, 0px))");
  }
}

// E: сама страница не прокручивается, прокручивается внутренняя область (как «оболочка приложения»)
function applyShell(on: boolean) {
  const html = document.documentElement;
  const body = document.body;
  if (on) {
    html.style.setProperty("height", "100dvh");
    html.style.setProperty("overflow", "hidden");
    body.style.setProperty("height", "100dvh");
    body.style.setProperty("overflow-y", "auto");
    body.style.setProperty("overscroll-behavior", "none");
  } else {
    for (const el of [html, body]) for (const prop of ["height", "overflow", "overflow-y", "overscroll-behavior"]) el.style.removeProperty(prop);
  }
}

function ToggleButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left rounded-xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
        on ? "bg-accent text-white border-accent" : "bg-card text-foreground border-border",
      ].join(" ")}
    >
      {on ? "ВКЛ · " : "ВЫКЛ · "}
      {label}
    </button>
  );
}

export default function DebugViewportPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [clip, setClip] = useState(false);
  const [maxScale, setMaxScale] = useState(true);
  const [shift, setShift] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [shell, setShell] = useState(false);
  const shiftCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    const update = () => setInfo(measure());
    const first = setTimeout(update, 300);
    const timer = setInterval(update, 800);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("scroll", update);
      shiftCleanup.current?.();
      document.documentElement.style.removeProperty("overflow-x");
      document.body.style.removeProperty("overflow-x");
      document.documentElement.style.removeProperty("--vv-shift");
      applySticky(false);
      applyShell(false);
    };
  }, []);

  function toggleSticky() {
    const next = !sticky;
    setSticky(next);
    applySticky(next);
  }

  function toggleShell() {
    const next = !shell;
    setShell(next);
    applyShell(next);
  }

  function toggleClip() {
    const next = !clip;
    setClip(next);
    for (const el of [document.documentElement, document.body]) {
      if (next) el.style.setProperty("overflow-x", "clip");
      else el.style.removeProperty("overflow-x");
    }
  }

  function toggleMaxScale() {
    const next = !maxScale;
    setMaxScale(next);
    const meta = document.querySelector('meta[name="viewport"]');
    meta?.setAttribute("content", next ? VIEWPORT_WITH_MAX_SCALE : VIEWPORT_WITHOUT_MAX_SCALE);
  }

  function toggleShift() {
    const next = !shift;
    setShift(next);
    shiftCleanup.current?.();
    shiftCleanup.current = null;
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!next || !vv) {
      root.style.removeProperty("--vv-shift");
      return;
    }
    const apply = () => root.style.setProperty("--vv-shift", `${Math.min(120, Math.max(0, vv.offsetTop))}px`);
    apply();
    vv.addEventListener("scroll", apply);
    vv.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, { passive: true });
    shiftCleanup.current = () => {
      vv.removeEventListener("scroll", apply);
      vv.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply);
    };
  }

  return (
    <main className="flex-1 px-4 pt-4 pb-40 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-xl mb-1">Диагностика экрана</h1>
      <p className="text-sm text-muted mb-4">
        Временная страница. Прокрутите её вниз-вверх и смотрите строку «РАЗРЫВ под меню»: нужно 0. Кнопками ниже включайте и
        выключайте возможные причины и смотрите, как меняется разрыв после прокрутки. Пришлите скриншоты.
      </p>

      <div className="flex flex-col gap-2 mb-5">
        <ToggleButton on={clip} onClick={toggleClip} label="A. overflow-x: clip на html и body (так было с 3 октября)" />
        <ToggleButton on={maxScale} onClick={toggleMaxScale} label="B. maximum-scale=1 в настройках экрана" />
        <ToggleButton on={shift} onClick={toggleShift} label="C. ручной сдвиг меню по visualViewport" />
        <ToggleButton on={sticky} onClick={toggleSticky} label="D. меню sticky внизу страницы вместо fixed" />
        <ToggleButton on={shell} onClick={toggleShell} label="E. прокручивается внутренняя область, а не вся страница" />
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        {info
          ? Object.entries(info).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-card border border-border px-3 py-2">
                <dt className="text-xs text-muted">{key}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))
          : null}
      </dl>

      {/* высокая заглушка: чтобы страницу можно было прокрутить, как обычные экраны */}
      <div className="h-[120vh]" aria-hidden />
    </main>
  );
}
