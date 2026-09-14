import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseCatalogFile } from "@/lib/catalogParser";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден в запросе." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { products, errors } = parseCatalogFile(buffer);

  if (products.length === 0) {
    return NextResponse.json(
      { error: "Не удалось распознать ни одного товара.", details: errors },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("store_id", profile.storeId);
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from("products").insert(
      products.map((product) => ({
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
    if (insertError) throw insertError;

    return NextResponse.json({
      ok: true,
      imported: products.length,
      warnings: errors,
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить каталог — база данных недоступна." },
      { status: 500 }
    );
  }
}
