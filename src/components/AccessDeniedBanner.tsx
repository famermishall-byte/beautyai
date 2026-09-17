"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AccessDeniedBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const denied = searchParams.get("denied");
  // Derived directly from the URL — no need for its own state. Once the
  // effect below strips `?denied=admin` from the URL, `denied` (and so
  // `visible`) naturally flips back to false on the next render.
  const visible = denied === "admin";

  useEffect(() => {
    if (denied === "admin") {
      const timer = setTimeout(() => {
        router.replace("/");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [denied, router]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium shadow-lg">
      🚫 Доступ запрещён — у вас нет прав администратора
    </div>
  );
}
