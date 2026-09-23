import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapPromotion } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

function computePrices(basePrice: number, discountType: string, discountValue: number): number {
  if (discountType === "percent") return Math.round(basePrice * (1 - discountValue / 100));
  if (discountType === "fixed") return Math.max(0, basePrice - discountValue);
  return discountValue; // special_price — discountValue сам является новой ценой
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("promotions")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ promotions: rows.map(mapPromotion) });
  } catch {
    return NextResponse.json({ promotions: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const { title, productId, discountType, discountValue, showOldPrice, startAt, endAt, status } = body;

  if (!title || !productId || !discountType || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название, товар, тип скидки и даты." }, { status: 400 });
  }
  if (!["percent", "fixed", "special_price"].includes(discountType)) {
    return NextResponse.json({ error: "Некорректный тип скидки." }, { status: 400 });
  }
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Некорректная скидка/цена." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: product } = await supabase
      .from("products")
      .select("price")
      .eq("id", productId)
      .eq("store_id", profile.storeId)
      .maybeSingle();
    if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });

    const oldPrice = product.price as number;
    const newPrice = computePrices(oldPrice, discountType, value);
    if (newPrice < 0) return NextResponse.json({ error: "Новая цена не может быть отрицательной." }, { status: 400 });

    const { data: promotion, error } = await supabase
      .from("promotions")
      .insert({
        store_id: profile.storeId,
        product_id: productId,
        title,
        discount_type: discountType,
        discount_value: value,
        old_price: oldPrice,
        new_price: newPrice,
        show_old_price: showOldPrice !== false,
        start_at: startAt,
        end_at: endAt,
        status: status || "draft",
      })
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, promotion: mapPromotion(promotion) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить акцию." }, { status: 500 });
  }
}
