import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  email: string | null;
  role: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  displayName: string | null;
  skinType: string | null;
  skinConcerns: string[];
};

/**
 * Verifies the current request's session and loads the user's role + store.
 * Returns null if there is no logged-in user, or their profile/store is
 * missing (shouldn't happen in normal use — the signup trigger creates it).
 *
 * Every API route should call this and resolve store_id from here, never
 * trust a store identifier sent by the client.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, store_id, display_name, skin_type, skin_concerns, stores(name, slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.store_id) return null;

  const store = profile.stores as unknown as { name: string; slug: string } | null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
    storeId: profile.store_id,
    storeName: store?.name ?? "",
    storeSlug: store?.slug ?? "",
    displayName: profile.display_name,
    skinType: profile.skin_type,
    skinConcerns: profile.skin_concerns ?? [],
  };
}

/** Admins and owners both get management access — owners can additionally transfer the store. */
export function isStoreManager(role: string): boolean {
  return role === "admin" || role === "owner";
}

