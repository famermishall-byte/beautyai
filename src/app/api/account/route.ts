import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

export async function DELETE() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // The avatar lives in storage, outside the account rows the RPC deletes — remove it first.
  await supabase.storage.from("avatars").remove([`${profile.userId}/avatar.jpg`]);
  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    return NextResponse.json({ error: "Не удалось удалить аккаунт." }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
