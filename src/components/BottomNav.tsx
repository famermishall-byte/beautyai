"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Search, Heart, User } from "lucide-react";
import { useSession } from "@/lib/session-context";

const ITEMS = [
  { href: "/", match: "/", labelKey: "home", icon: Home },
  { href: "/profile", match: "/profile", labelKey: "profile", icon: User },
  { href: "/catalog?tab=search", match: "/catalog", labelKey: "search", icon: Search },
  { href: "/mybag", match: "/mybag", labelKey: "myBag", icon: Heart },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isAdmin } = useSession();

  if (isAdmin) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-nav bg-card/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto grid grid-cols-4" style={{ height: "var(--bottom-nav-h)" }}>
        {ITEMS.map(({ href, match, labelKey, icon: Icon }) => {
          const active = match === "/" ? pathname === "/" : pathname.startsWith(match);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="group relative flex flex-col items-center justify-center gap-1 focus-visible:outline-none"
            >
              <span
                className={[
                  "flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200",
                  active ? "bg-accent-soft" : "group-hover:bg-state-hover",
                ].join(" ")}
              >
                <Icon
                  className={["size-5 transition-colors", active ? "text-accent" : "text-muted"].join(" ")}
                  strokeWidth={active ? 2.25 : 1.85}
                  fill={active && Icon === Heart ? "currentColor" : "none"}
                  aria-hidden
                />
              </span>
              <span
                className={["text-2xs font-medium leading-none transition-colors", active ? "text-accent" : "text-muted"].join(
                  " "
                )}
              >
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
