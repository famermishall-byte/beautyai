import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapPromotion, mapProduct } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("promotions")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .eq("status", "active")
      .not("product_id", "is", null)
      .order("end_at", { ascending: true });
    if (error) throw error;

    const promotions = rows.map(mapPromotion);
    const byProduct = indexPromotionsByProduct(promotions);
    const productIds = [...byProduct.keys()];
    if (productIds.length === 0) return NextResponse.json({ products: [] });

    const { data: productRows } = await supabase.from("products").select("*").in("id", productIds).eq("in_stock", true);
    const productsById = new Map((productRows ?? []).map((p) => [p.id as string, mapProduct(p)]));

    // Порядок — как у акций (по дате окончания), не как вернула таблица products.
    const products = promotions
      .filter((p) => p.productId && productsById.has(p.productId))
      .map((p) => applyActivePromotion(productsById.get(p.productId as string)!, byProduct));

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [], error: "База данных недоступна." });
  }
}
