import { getLocale } from "next-intl/server";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

// Server-side gate: this runs on every request for /admin/* before any
// admin UI or data ever renders. A USER hitting /admin directly (typed URL,
// bookmark, etc.) never sees the admin page — they're bounced back with a
// flag the home page turns into an "Access denied" message.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  if (!profile || !isStaff(profile.role)) {
    redirect({ href: "/?denied=admin", locale: await getLocale() });
  }

  return <>{children}</>;
}
