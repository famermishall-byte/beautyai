"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = { ru: "RU", ky: "KY" };

/**
 * RU / KY switch. Changes the /ru | /ky URL prefix (keeping the page and query string) and remembers the
 * choice in the NEXT_LOCALE cookie, so the next visit opens in the same language.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    try {
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookies blocked — the URL prefix alone still selects the language
    }
    router.replace(`${pathname}${window.location.search}`, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`shrink-0 flex items-center rounded-full bg-black/[0.05] p-0.5 ${className}`}
    >
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
