import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { Product } from "@/types";

function toProduct(p: Record<string, unknown>) {
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode ?? null,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    description: p.description,
    characteristics: p.characteristics,
    purpose: p.purpose,
    nameKy: p.name_ky ?? null,
    descriptionKy: p.description_ky ?? null,
    characteristicsKy: p.characteristics_ky ?? null,
    purposeKy: p.purpose_ky ?? null,
    inStock: p.in_stock,
    imageUrl: p.image_url,
    attributes: p.attributes ?? undefined,
  };
}

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_products")
    .select("product_id, products(*)")
    .eq("user_id", profile.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }

  const products = (data ?? [])
    .map((row) => row.products as unknown as Record<string, unknown> | null)
    .filter((p): p is Record<string, unknown> => Boolean(p))
    .map(toProduct);

  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", profile.storeId)
    .eq("status", "active")
    .not("product_id", "is", null);
  const promotionsByProduct = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));

  return NextResponse.json({
    products: products.map((p) => applyActivePromotion(p as Product, promotionsByProduct)),
  });
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const body = await request.json();
  const productId = body.productId;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "Не указан товар." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("saved_products")
    .upsert(
      { user_id: profile.userId, store_id: profile.storeId, product_id: productId },
      { onConflict: "user_id,product_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Не удалось сохранить товар." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Не указан товар." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("user_id", profile.userId)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: "Не удалось удалить товар." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
