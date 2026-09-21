"use client";

import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/lib/use-go-back";

// Back arrow for the pages that have no shared header (sign-in flow). The sign-in page itself is the
// entry point — there is nowhere to go back to from it.
export function AuthBack() {
  const pathname = usePathname();
  const goBack = useGoBack("/login");
  if (pathname === "/login") return null;
  return (
    <button
      onClick={goBack}
      aria-label="Назад"
      className="fixed top-3 left-3 z-10 w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
    </button>
  );
}
