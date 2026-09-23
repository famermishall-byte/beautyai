import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapFeedback } from "@/lib/supabase";
import { getSessionProfile, isStaff } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStaff(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("feedback")
      .select("*, branches(name)")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });
    // Управляющий филиала видит только отзывы своего филиала; RLS это тоже
    // обеспечивает, но фильтр здесь делает намерение явным и не зависит от RLS.
    if (profile.role === "branch_manager") {
      query = query.eq("branch_id", profile.branchId);
    }
    const { data: rows, error } = await query;

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
