import { redirect } from "next/navigation";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

// Server-side gate: this runs on every request for /admin/* before any
// admin UI or data ever renders. A USER hitting /admin directly (typed URL,
// bookmark, etc.) never sees the admin page — they're bounced back with a
// flag the home page turns into a "Доступ запрещён" message.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  if (!profile || !isStoreManager(profile.role)) {
    redirect("/?denied=admin");
  }

  return <>{children}</>;
}
