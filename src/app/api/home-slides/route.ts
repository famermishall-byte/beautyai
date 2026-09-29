import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapHomeSlide, mapProduct, mapPromotion } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import { visibleSlides } from "@/lib/home-slides";
import type { Product } from "@/types";

/** Промо-слайды для верхнего слайдера на главной: активные, по порядку, с товаром (цена с учётом акции). */
export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("home_slides")
      .select("*")
      .eq("store_id", profile.storeId)
      .eq("active", true)
      .order("priority", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) return NextResponse.json({ slides: [] });

    const productIds = [...new Set(rows.map((r) => r.product_id as string | null).filter((id): id is string => !!id))];
    const productsById = new Map<string, Product>();
    if (productIds.length > 0) {
      const { data: productRows } = await supabase.from("products").select("*").in("id", productIds).eq("store_id", profile.storeId);
      const { data: promoRows } = await supabase
        .from("promotions")
        .select("*")
        .eq("store_id", profile.storeId)
        .eq("status", "active")
        .not("product_id", "is", null);
      const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
      for (const p of productRows ?? []) {
        productsById.set(p.id as string, applyActivePromotion(mapProduct(p) as Product, promotionsByProduct));
      }
    }

    const slides = rows.map((r) => mapHomeSlide(r, r.product_id ? (productsById.get(r.product_id as string) ?? null) : null));
    return NextResponse.json({ slides: visibleSlides(slides) });
  } catch {
    return NextResponse.json({ slides: [], error: "База данных недоступна." });
  }
}
