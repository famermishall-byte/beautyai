"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const SHOW_MS = 3200;
const FADE_MS = 350;

export function LogoIntro({ storeName, onDone }: { storeName: string; onDone: () => void }) {
  const t = useTranslations("intro");
  const [leaving, setLeaving] = useState(false);
  // Held in a ref so a parent re-render (new inline callback) never restarts the timer.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (leaving) {
      const t = setTimeout(() => onDoneRef.current(), FADE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <div
      onClick={() => setLeaving(true)}
      role="dialog"
      aria-label={t("label")}
      className={[
        "fixed inset-0 z-[80] flex flex-col items-center justify-center bg-accent text-white px-6 transition-opacity",
        leaving ? "opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative w-44 h-44 flex items-center justify-center mb-10">
        <span className="intro-ring absolute inset-0 rounded-full border-2 border-white/60" aria-hidden />
        <span className="intro-ring absolute inset-0 rounded-full border-2 border-white/60" style={{ animationDelay: "1.1s" }} aria-hidden />
        <Image
          src="/icon-512.png"
          alt=""
          width={176}
          height={176}
          priority
          className="intro-logo relative rounded-full"
        />
      </div>

      <h1 className="intro-text font-display text-3xl text-center leading-tight" style={{ animationDelay: "0.7s" }}>
        {storeName}
      </h1>
      <p className="intro-text text-white/75 text-sm mt-2" style={{ animationDelay: "1s" }}>
        {t("tagline")}
      </p>

      <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-white/60">
        {t("skip")}
      </span>
    </div>
  );
}
