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

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const productId: string | undefined = body.productId;
  if (!productId) return NextResponse.json({ error: "Выберите товар." }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();
    // Новый товар — в конец списка (следующий свободный priority), не первым.
    const { data: last } = await supabase
      .from("new_arrivals")
      .select("priority")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPriority = last ? (last.priority as number) + 1 : 0;

    const { data: row, error } = await supabase
      .from("new_arrivals")
      .insert({ store_id: profile.storeId, product_id: productId, priority: nextPriority })
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, item: mapNewArrival(row) });
  } catch {
    // Скорее всего дубль — на этот товар уже есть запись (unique(store_id, product_id)).
    return NextResponse.json({ error: "Не удалось добавить — возможно, этот товар уже в списке." }, { status: 400 });
  }
}
