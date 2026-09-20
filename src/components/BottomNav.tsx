"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User } from "lucide-react";
import { useSession } from "@/lib/session-context";

const ITEMS = [
  { href: "/", match: "/", label: "Главная", icon: Home },
  { href: "/profile", match: "/profile", label: "Профиль", icon: User },
  { href: "/catalog?tab=search", match: "/catalog", label: "Поиск", icon: Search },
  { href: "/mybag", match: "/mybag", label: "Косметичка", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useSession();

  if (isAdmin) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto grid grid-cols-4" style={{ height: "var(--bottom-nav-h)" }}>
        {ITEMS.map(({ href, match, label, icon: Icon }) => {
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
                  active ? "bg-accent-soft" : "group-hover:bg-black/[0.04]",
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
                className={["text-[11px] font-medium leading-none transition-colors", active ? "text-accent" : "text-muted"].join(
                  " "
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
