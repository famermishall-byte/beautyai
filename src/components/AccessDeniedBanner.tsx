"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AccessDeniedBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  const denied = searchParams.get("denied");

  useEffect(() => {
    if (denied === "admin") {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
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
