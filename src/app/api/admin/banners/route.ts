import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: rows, error } = await supabase
      .from("banners")
      .select("*, products(id, name, brand, image_url, price)")
      .eq("store_id", profile.storeId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ banners: rows.map(mapBanner) });
  } catch {
    return NextResponse.json({ banners: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const body = await request.json();
  const { title, subtitle, imageUrl, productId, buttonText, startAt, endAt, status, priority } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название и даты показа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: banner, error } = await supabase
      .from("banners")
      .insert({
        store_id: profile.storeId,
        product_id: productId || null,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl || null,
        button_text: buttonText || null,
        start_at: startAt,
        end_at: endAt,
        status: status || "draft",
        priority: typeof priority === "number" ? priority : 0,
      })
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, banner: mapBanner(banner) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить баннер." }, { status: 500 });
  }
}
