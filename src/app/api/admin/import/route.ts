import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import type { ParsedImportProduct } from "@/lib/import/types";

/**
 * Inserts already-validated product rows (built client-side by the import
 * wizard — see src/lib/import/). This is additive, unlike the old
 * upload-and-replace flow: existing catalog rows are left alone. Duplicate
 * SKUs are re-checked here (not just trusted from the client) since time
 * may have passed between preview and confirm, and skipped rather than
 * failing the whole import — the DB's unique (store_id, sku) constraint is
 * the final backstop if a race slips past this check.
 */
export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const body = await request.json();
  const products: ParsedImportProduct[] = Array.isArray(body.products) ? body.products : [];

  if (products.length === 0) {
    return NextResponse.json({ error: "Нет товаров для импорта." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("sku")
    .eq("store_id", profile.storeId);
  if (existingError) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
  const existingSkus = new Set((existing ?? []).map((p) => p.sku));

  const toInsert = products.filter((p) => !existingSkus.has(p.sku));
  const skippedDuplicates = products.filter((p) => existingSkus.has(p.sku)).map((p) => p.sku);

  if (toInsert.length === 0) {
    return NextResponse.json({
      ok: true,
      imported: 0,
      skippedDuplicates,
    });
  }

  const { error: insertError } = await supabase.from("products").insert(
    toInsert.map((product) => ({
      store_id: profile.storeId,
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      description: product.description || null,
      characteristics: product.characteristics || null,
      purpose: product.purpose || null,
      in_stock: product.inStock,
      image_url: product.imageUrl || null,
    }))
  );

  if (insertError) {
    return NextResponse.json({ error: "Не удалось сохранить товары." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    imported: toInsert.length,
    skippedDuplicates,
  });
}
