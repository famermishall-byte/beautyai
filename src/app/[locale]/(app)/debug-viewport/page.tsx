"use client";

import { useEffect, useState } from "react";

// ВРЕМЕННАЯ страница диагностики экрана iPhone (04.10.2026): полоса под нижним меню в приложении с иконки «Домой».
// Показывает, какие размеры сообщает браузер, и где стоит нижнее меню. Удалить после исправления.
type Info = Record<string, string>;

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
  const lvh = document.createElement("div");
  lvh.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;height:100lvh";
  const svh = document.createElement("div");
  svh.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;height:100svh";
  const dvh = document.createElement("div");
  dvh.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;height:100dvh";
  document.body.append(lvh, svh, dvh);
  const heights = { lvh: lvh.offsetHeight, svh: svh.offsetHeight, dvh: dvh.offsetHeight };
  lvh.remove();
  svh.remove();
  dvh.remove();

  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const r = (n: number | undefined) => (n === undefined ? "—" : String(Math.round(n * 10) / 10));
  return {
    "режим «Домой» (standalone)": standalone ? "да" : "нет",
    "window.innerHeight": r(window.innerHeight),
    "window.outerHeight": r(window.outerHeight),
    "screen.height": r(screen.height),
    "screen.availHeight": r(screen.availHeight),
    "documentElement.clientHeight": r(document.documentElement.clientHeight),
    "visualViewport.height": r(vv?.height),
    "visualViewport.offsetTop": r(vv?.offsetTop),
    "100lvh / 100svh / 100dvh": `${heights.lvh} / ${heights.svh} / ${heights.dvh}`,
    "safe-area top / bottom": `${safeTop} / ${safeBottom}`,
    "нижнее меню: верх / низ (px от верха окна)": navRect ? `${r(navRect.top)} / ${r(navRect.bottom)}` : "меню не найдено",
    "применённый сдвиг (--vv-shift)": document.documentElement.style.getPropertyValue("--vv-shift") || "нет",
    "высота меню": r(navRect?.height),
    "разрыв: innerHeight − низ меню": navRect ? r(window.innerHeight - navRect.bottom) : "—",
    "разрыв: screen.height − низ меню": navRect ? r(screen.height - navRect.bottom) : "—",
    "прокрутка страницы (scrollY)": r(window.scrollY),
    devicePixelRatio: r(window.devicePixelRatio),
    "ширина окна": r(window.innerWidth),
  };
}

export default function DebugViewportPage() {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    const update = () => setInfo(measure());
    const first = setTimeout(update, 300);
    const timer = setInterval(update, 1000);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <main className="flex-1 px-4 pt-4 pb-40 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-xl mb-1">Диагностика экрана</h1>
      <p className="text-sm text-muted mb-4">
        Временная страница. Сделайте скриншот всего экрана (с часами сверху и меню внизу) и пришлите. Числа обновляются сами.
      </p>
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
    </main>
  );
}
