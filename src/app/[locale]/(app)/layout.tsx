import { cookies } from "next/headers";
import { AppProviders } from "@/components/AppProviders";
import { ACTIVE_COOKIE, SPLASH_FORCE_COOKIE, shouldShowSplash } from "@/lib/splash-cookie";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const showSplash = shouldShowSplash({
    hasActiveMark: cookieStore.has(ACTIVE_COOKIE),
    forced: cookieStore.has(SPLASH_FORCE_COOKIE),
  });

  return <AppProviders splashAlreadyShown={!showSplash}>{children}</AppProviders>;
}
