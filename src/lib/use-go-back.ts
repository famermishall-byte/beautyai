"use client";

import { useRouter } from "@/i18n/navigation";

// One step back in history; when the page was opened directly (no history to
// return to, e.g. a shared link or a fresh PWA launch) go to the fallback.
export function useGoBack(fallback = "/") {
  const router = useRouter();
  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
}
