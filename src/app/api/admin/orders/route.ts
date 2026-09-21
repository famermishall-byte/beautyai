import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
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
    let query = supabase.from("orders").select("*, branches(*)").eq("store_id", profile.storeId).order("created_at", { ascending: false });
    if (profile.role === "branch_manager") {
      // Only the orders of their own branch (RLS enforces the same on the database side).
      if (!profile.branchId) return NextResponse.json({ orders: [], error: "Вам пока не назначен филиал." }, { status: 403 });
      query = query.eq("branch_id", profile.branchId);
    }
    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch {
    return NextResponse.json({ orders: [], error: "База данных недоступна." });
  }
}
