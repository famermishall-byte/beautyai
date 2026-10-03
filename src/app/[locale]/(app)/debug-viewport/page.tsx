"use client";

import { useEffect, useState } from "react";

// ВРЕМЕННАЯ страница диагностики экрана iPhone (04.10.2026): полоса под нижним меню в приложении с иконки «Домой».
// Показывает размеры, которые сообщает браузер, и положение нижнего меню. Удалить после подтверждения исправления.
type Info = Record<string, string>;

function measure(): Info {
  const nav = document.querySelector("nav.fixed") as HTMLElement | null;
  const navRect = nav?.getBoundingClientRect();
  const vv = window.visualViewport;
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const r = (n: number | undefined) => (n === undefined ? "—" : String(Math.round(n * 10) / 10));
  return {
    "режим «Домой» (standalone)": standalone ? "да" : "нет",
    "внутренняя прокрутка включена (ios-shell)": document.documentElement.classList.contains("ios-shell") ? "да" : "нет",
    "window.innerHeight": r(window.innerHeight),
    "screen.height": r(screen.height),
    "visualViewport.height": r(vv?.height),
    "visualViewport.offsetTop": r(vv?.offsetTop),
    "нижнее меню: верх / низ": navRect ? `${r(navRect.top)} / ${r(navRect.bottom)}` : "меню не найдено",
    "РАЗРЫВ под меню (innerHeight − низ меню)": navRect ? r(window.innerHeight - navRect.bottom) : "—",
    "прокрутка страницы / внутренней области": `${r(window.scrollY)} / ${r(document.body.scrollTop)}`,
  };
}

export default function DebugViewportPage() {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    const update = () => setInfo(measure());
    const first = setTimeout(update, 300);
    const timer = setInterval(update, 800);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="flex-1 px-4 pt-4 pb-40 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-xl mb-1">Диагностика экрана</h1>
      <p className="text-sm text-muted mb-4">
        Временная страница. Прокрутите её вниз-вверх и смотрите строку «РАЗРЫВ под меню»: нужно 0. Числа обновляются сами.
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

      {/* высокая заглушка: чтобы страницу можно было прокрутить, как обычные экраны */}
      <div className="h-[120vh]" aria-hidden />
    </main>
  );
}
