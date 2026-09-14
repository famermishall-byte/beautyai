"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-context";

const TABS = [
  { href: "/", label: "Витрина" },
  { href: "/orders", label: "Мои заказы" },
];

export function NavHeader() {
  const pathname = usePathname();
  const { session, isAdmin, signOut } = useSession();

  const tabs = isAdmin ? [...TABS, { href: "/admin", label: "Админ" }] : TABS;

  return (
    <header className="w-full border-b border-black/5 bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm tracking-[0.3em] uppercase font-medium rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
        >
          {session?.storeName || "BeautyAI"}
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "px-3 py-1.5 rounded-full text-sm font-medium transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:text-foreground hover:bg-black/5",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => signOut()}
            className="ml-1 px-3 py-1.5 rounded-full text-sm font-medium text-muted transition hover:text-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
