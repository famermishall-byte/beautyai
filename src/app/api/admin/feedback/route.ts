import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapFeedback } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // feedback.user_id and profiles.id both reference auth.users, but there's
    // no direct FK between the two tables, so PostgREST can't embed profiles
    // automatically — fetch names separately and merge by id.
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string | null }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    const feedback = rows.map((row) =>
      mapFeedback({ ...row, profiles: { display_name: nameById.get(row.user_id as string) ?? null } })
    );

    return NextResponse.json({ feedback });
  } catch {
    return NextResponse.json({ feedback: [], error: "База данных недоступна." });
  }
}
