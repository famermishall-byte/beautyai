// One account, two modes. A staff member (owner / admin / branch manager) works in the admin area and can
// switch to the storefront to shop as a customer with the SAME login, then switch back. The cookie only decides
// which screens the proxy lets them open — real permissions are always checked on the server by their role.

const COOKIE = "beautyai-mode";

/** Open the storefront as a customer ("shop") or go back to the admin area ("admin"). */
export function switchViewMode(mode: "shop" | "admin") {
  document.cookie = mode === "shop" ? `${COOKIE}=shop; path=/; max-age=604800; samesite=lax` : `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.location.assign(mode === "shop" ? "/" : "/admin");
}
