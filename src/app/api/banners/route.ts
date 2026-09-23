import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner, mapPromotion } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { isVisibleToCustomers } from "@/lib/promo-status";
import { indexPromotionsByProduct } from "@/lib/apply-promotion";

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

    // Баннер без товара — законный случай (общая реклама/акция без привязки к конкретной
    // позиции, напр. «скидки именинникам»); раньше такие баннеры сюда не попадали вовсе,
    // хотя админка позволяет их создать — клиент их просто никогда не видел.
    const banners = rows.map(mapBanner).filter((b) => isVisibleToCustomers(b));

    const { data: promoRows } = await supabase
      .from("promotions")
      .select("*")
      .eq("store_id", profile.storeId)
      .eq("status", "active")
      .not("product_id", "is", null);
    const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));

    for (const banner of banners) {
      if (!banner.product) continue;
      const promotion = promotionsByProduct.get(banner.product.id);
      if (promotion) banner.product.price = promotion.newPrice;
    }

    return NextResponse.json({ banners });
  } catch {
    return NextResponse.json({ banners: [], error: "База данных недоступна." });
  }
}
