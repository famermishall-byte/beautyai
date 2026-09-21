// The chosen interface language is remembered in next-intl's NEXT_LOCALE cookie, so the next visit
// (or a link without a /ru|/ky prefix) opens in the same language. Kept out of the component because
// writing document.cookie is a side effect on a global.
export function rememberLocale(locale: string) {
  try {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // cookies blocked — the URL prefix alone still selects the language
  }
}
