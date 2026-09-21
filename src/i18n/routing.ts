import { defineRouting } from "next-intl/routing";

// Two interface languages. Russian is the default; the choice is remembered in the NEXT_LOCALE cookie
// (next-intl sets it automatically), so a returning visitor is sent to their last language.
export const routing = defineRouting({
  locales: ["ru", "ky"],
  defaultLocale: "ru",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
