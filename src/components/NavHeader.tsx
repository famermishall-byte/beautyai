"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { MapPin, LogOut, Search, ArrowLeft, ShoppingBag, LayoutDashboard } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { useGoBack } from "@/lib/use-go-back";
import { getStoredCity } from "@/lib/city";
import { switchViewMode } from "@/lib/view-mode";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function NavHeader() {
  const t = useTranslations("nav");
  const tMeta = useTranslations("meta");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { session, isAdmin, isManager, signOut } = useSession();
  const [city, setCity] = useState<string | null>(null);
  const goBack = useGoBack(isAdmin ? "/admin" : "/");

  // A back arrow on every inner page. The home screen (and an admin's home,
  // /admin) is the root, and a product page draws its own arrow over the photo.
  const isRoot = pathname === "/" || pathname === "/admin";
  const showBack = !isRoot && !pathname.startsWith("/product/");

  useEffect(() => {
    // Re-read on every navigation (e.g. after visiting /city) — deferred via
    // a resolved microtask so this isn't a synchronous setState-in-effect.
    Promise.resolve().then(() => setCity(getStoredCity()));
  }, [pathname]);

  return (
    <header className="w-full border-b border-border bg-card/85 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {showBack && (
          <button
            onClick={goBack}
            aria-label={tc("back")}
            className="shrink-0 -ml-2 w-10 h-10 rounded-full flex items-center justify-center text-foreground transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <Link
            href={isAdmin ? "/admin" : "/"}
            className="text-sm tracking-[0.3em] uppercase font-medium leading-tight rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent truncate"
          >
            {session?.storeName || tMeta("title")}
          </Link>
          {!isAdmin && (
            <Link
              href="/city"
              className="flex items-center gap-0.5 text-[11px] font-medium text-muted hover:text-accent transition w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <MapPin className="size-3" strokeWidth={2} aria-hidden />
              <span className="max-w-[10rem] truncate">{city ?? t("chooseCity")}</span>
            </Link>
          )}
        </div>

        <LanguageSwitcher compact />

        {!isAdmin && isManager && (
          <button
            onClick={() => switchViewMode("admin")}
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3 py-1.5 text-sm font-medium transition hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LayoutDashboard className="size-4" strokeWidth={2} aria-hidden />
            {t("adminShort")}
          </button>
        )}

        {!isAdmin && (
          <Link
            href="/catalog?tab=search"
            aria-label={t("search")}
            className="shrink-0 -mr-2 w-10 h-10 rounded-full flex items-center justify-center text-foreground transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Search className="size-5" strokeWidth={2} aria-hidden />
          </Link>
        )}

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                pathname.startsWith("/admin")
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-foreground hover:bg-black/5",
              ].join(" ")}
            >
              {t("admin")}
            </Link>
            <button
              onClick={() => switchViewMode("shop")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:text-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ShoppingBag className="size-4" strokeWidth={1.85} aria-hidden />
              {t("toShop")}
            </button>
            <button
              onClick={() => signOut()}
              aria-label={t("signOut")}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted transition hover:text-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut className="size-4" strokeWidth={1.85} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
