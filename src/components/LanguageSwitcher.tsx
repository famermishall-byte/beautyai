"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { rememberLocale } from "@/lib/locale-cookie";

const LABELS: Record<Locale, string> = { ky: "KG", ru: "RUS" };

/**
 * KG / RUS switch (globe icon + two buttons, Kyrgyz first). Changes the /ru | /ky URL prefix (keeping the page and query string) and remembers the
 * choice in the NEXT_LOCALE cookie, so the next visit opens in the same language.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    rememberLocale(next);
    router.replace(`${pathname}${window.location.search}`, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`shrink-0 flex items-center gap-1 rounded-full bg-black/[0.05] py-0.5 pl-2 pr-0.5 ${className}`}
    >
      <Globe className="size-4 text-accent" strokeWidth={2} aria-hidden />
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => choose(code)}
            aria-pressed={active}
            className={[
              "px-2 py-1 rounded-full text-[11px] font-semibold leading-none transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-card text-accent shadow-sm" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
