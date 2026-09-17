import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapOrder } from "@/lib/supabase";
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
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, branches(*)")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: orders.map(mapOrder) });
  } catch {
    return NextResponse.json({ orders: [], error: "База данных недоступна." });
  }
}
