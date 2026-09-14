import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBranch } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branches, error } = await supabase
      .from("branches")
      .select("*")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ branches: branches.map(mapBranch) });
  } catch {
    return NextResponse.json({ branches: [], error: "База данных недоступна." });
  }
}
