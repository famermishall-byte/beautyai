import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SessionProfile = {
  userId: string;
  email: string | null;
  role: string;
  storeId: string;
  /** Only for role "branch_manager": the one branch they run. */
  branchId: string | null;
  storeName: string;
  storeSlug: string;
  displayName: string | null;
  skinType: string | null;
  skinConcerns: string[];
  birthDate: string | null;
  gender: string | null;
  hairType: string | null;
  hairConcerns: string[];
  avatarUrl: string | null;
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
    .select("role, store_id, display_name, skin_type, skin_concerns, birth_date, gender, hair_type, hair_concerns, avatar_url, stores(name, slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.store_id) return null;

  const store = profile.stores as unknown as { name: string; slug: string } | null;

  // Read separately, and only for branch managers, so that sign-in keeps working even before the
  // staff_roles.sql migration (which adds this column) has been run.
  let branchId: string | null = null;
  if (profile.role === "branch_manager") {
    const { data: b } = await supabase.from("profiles").select("branch_id").eq("id", user.id).maybeSingle();
    branchId = (b?.branch_id as string | null) ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
    storeId: profile.store_id,
    branchId,
    storeName: store?.name ?? "",
    storeSlug: store?.slug ?? "",
    displayName: profile.display_name,
    skinType: profile.skin_type,
    skinConcerns: profile.skin_concerns ?? [],
    birthDate: profile.birth_date ?? null,
    gender: profile.gender ?? null,
    hairType: profile.hair_type ?? null,
    hairConcerns: profile.hair_concerns ?? [],
    avatarUrl: profile.avatar_url ?? null,
  };
}

/** Admins and owners both get management access — owners can additionally transfer the store. */
export function isStoreManager(role: string): boolean {
  return role === "admin" || role === "owner";
}

/** Everyone who works in the admin area: owner and admin (whole store) and branch_manager (their own branch only). */
export function isStaff(role: string): boolean {
  return role === "admin" || role === "owner" || role === "branch_manager";
}

