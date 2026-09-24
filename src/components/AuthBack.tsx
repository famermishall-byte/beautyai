"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoBack } from "@/lib/use-go-back";
import { usePathname } from "@/i18n/navigation";

// Back arrow for the pages that have no shared header (sign-in flow). The sign-in page itself is the
// entry point — there is nowhere to go back to from it.
export function AuthBack() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const goBack = useGoBack("/login");
  if (pathname === "/login") return null;
  return (
    <button
      onClick={goBack}
      aria-label={t("back")}
      className="fixed top-3 left-3 z-raised w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center transition hover:bg-state-hover active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
    </button>
  );
}
