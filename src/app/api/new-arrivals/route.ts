import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";

/**
 * Публичный список «Новинок» — товары, которые owner/admin выбрали в /admin/promo (вкладка
 * «Новинки»), в их порядке (priority). Один и тот же список кормит и верхний слайдер на главной,
 * и плитку «Новинки» в каталоге (по просьбе владельца, 24.09).
 */
export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("new_arrivals")
      .select("product_id")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: true });
    if (error) throw error;

    const orderedIds = (rows ?? []).map((r) => r.product_id as string);
    if (orderedIds.length === 0) return NextResponse.json({ products: [] });

    const { data: productRows } = await supabase.from("products").select("*").in("id", orderedIds).eq("in_stock", true);
    const productsById = new Map((productRows ?? []).map((p) => [p.id as string, mapProduct(p)]));
    const products = orderedIds.filter((id) => productsById.has(id)).map((id) => productsById.get(id)!);

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [], error: "База данных недоступна." });
  }
}
