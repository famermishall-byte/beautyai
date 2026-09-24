import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapNewArrival } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("new_arrivals")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: rows.map(mapNewArrival) });
  } catch {
    return NextResponse.json({ items: [], error: "База данных недоступна." });
  }
}

/**
 * Сохраняет весь список сразу (кнопка «Сохранить» в NewArrivalsManager.tsx) — не по одному
 * действию: добавление/удаление/перестановка в админке только меняют список на экране, а сюда
 * уходит финальный порядок целиком. Проще всего и без гонок — удалить всё старое и вставить
 * заново с priority = позиция в массиве.
 */
export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const productIds: unknown = body.productIds;
  if (!Array.isArray(productIds) || !productIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Некорректный список товаров." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: deleteError } = await supabase.from("new_arrivals").delete().eq("store_id", profile.storeId);
    if (deleteError) throw deleteError;

    if (productIds.length > 0) {
      const rows = productIds.map((productId, i) => ({ store_id: profile.storeId, product_id: productId, priority: i }));
      const { error: insertError } = await supabase.from("new_arrivals").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить список." }, { status: 500 });
  }
}
