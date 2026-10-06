// One account, two modes. A staff member (owner / admin / branch manager) works in the admin area and can
// switch to the storefront to shop as a customer with the SAME login, then switch back. The cookie only decides
// which screens the proxy lets them open — real permissions are always checked on the server by their role.

import { SPLASH_FORCE_COOKIE } from "@/lib/splash-cookie";

const COOKIE = "beautyai-mode";

/** Open the storefront as a customer ("shop") or go back to the admin area ("admin"). */
export function switchViewMode(mode: "shop" | "admin") {
  document.cookie = mode === "shop" ? `${COOKIE}=shop; path=/; max-age=604800; samesite=lax` : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  // Переход из админки в магазин — «открытие» магазина: покажем заставку (layout.tsx прочитает эту метку).
  if (mode === "shop") document.cookie = `${SPLASH_FORCE_COOKIE}=1; path=/; max-age=60; samesite=lax`;
  // Full reload (fresh session/role state) — keep the language the page is currently shown in.
  const locale = document.documentElement.lang || "ky";
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/${locale}${mode === "shop" ? "" : "/admin"}`);
}
