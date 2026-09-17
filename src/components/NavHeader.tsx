"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-context";

export function NavHeader() {
  const pathname = usePathname();
  const { session, isAdmin } = useSession();

  return (
    <header className="w-full border-b border-black/5 bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="text-sm tracking-[0.3em] uppercase font-medium rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
        >
          {session?.storeName || "ОПТОВЫЕ ЦЕНЫ 01"}
        </Link>
        {isAdmin && (
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
            Админ
          </Link>
        )}
      </div>
    </header>
  );
}
