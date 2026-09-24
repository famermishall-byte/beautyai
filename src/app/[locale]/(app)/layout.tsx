import { cookies } from "next/headers";
import { AppProviders } from "@/components/AppProviders";
import { SPLASH_COOKIE, splashRecentlyShown } from "@/lib/splash-cookie";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const splashAlreadyShown = splashRecentlyShown(cookieStore.get(SPLASH_COOKIE)?.value);

  return <AppProviders splashAlreadyShown={splashAlreadyShown}>{children}</AppProviders>;
}
