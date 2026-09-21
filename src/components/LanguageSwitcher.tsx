"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { rememberLocale } from "@/lib/locale-cookie";

const LABELS: Record<Locale, string> = { ky: "KG", ru: "RUS" };

/**
 * Language switch. Changes the /ky | /ru URL prefix (keeping the page and query string) and remembers the
 * choice in the NEXT_LOCALE cookie, so the next visit opens in the same language.
 *  - default: globe icon + two buttons "KG" / "RUS" (used on the sign-in card, there is room);
 *  - compact: one round globe button that switches to the other language — used in the header, where the
 *    Admin / "В магазин" controls must keep their space on a phone screen.
 */
export function LanguageSwitcher({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    rememberLocale(next);
    router.replace(`${pathname}${window.location.search}`, { locale: next });
  }

  if (compact) {
    const other = routing.locales.find((code) => code !== locale) ?? locale;
    return (
      <button
        type="button"
        onClick={() => choose(other)}
        aria-label={`${t("language")}: ${LABELS[other]}`}
        title={`${t("language")}: ${LABELS[locale]} → ${LABELS[other]}`}
        className={`shrink-0 relative w-9 h-9 rounded-full flex items-center justify-center text-accent transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      >
        <Globe className="size-5" strokeWidth={1.85} aria-hidden />
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent text-white text-[8px] font-bold leading-none px-1 py-0.5">
          {LABELS[locale]}
        </span>
      </button>
    );
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
