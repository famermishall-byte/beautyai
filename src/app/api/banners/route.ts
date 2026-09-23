import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { isVisibleToCustomers } from "@/lib/promo-status";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("banners")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .eq("status", "active")
      .order("priority", { ascending: true });
    if (error) throw error;

    const banners = rows
      .map(mapBanner)
      .filter((b) => b.productId !== null && isVisibleToCustomers(b));

    return NextResponse.json({ banners });
  } catch {
    return NextResponse.json({ banners: [], error: "База данных недоступна." });
  }
}
