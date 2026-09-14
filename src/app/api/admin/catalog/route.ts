import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/supabase";
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
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      storeName: profile.storeName,
      count: products.length,
      products: products.map(mapProduct),
    });
  } catch {
    return NextResponse.json({ count: 0, products: [], error: "База данных недоступна." });
  }
}
