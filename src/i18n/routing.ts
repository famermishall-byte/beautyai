import { defineRouting } from "next-intl/routing";

// Two interface languages. Kyrgyz is first and the default; the choice is remembered in the NEXT_LOCALE cookie
// (next-intl sets it automatically), so a returning visitor is sent to their last language.
export const routing = defineRouting({
  locales: ["ky", "ru"],
  defaultLocale: "ky",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
