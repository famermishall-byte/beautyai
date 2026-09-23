import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBanner } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { title, subtitle, imageUrl, productId, buttonText, startAt, endAt, status, priority } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "Заполните название и даты показа." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: banner, error } = await supabase
      .from("banners")
      .update({
        product_id: productId || null,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl || null,
        button_text: buttonText || null,
        start_at: startAt,
        end_at: endAt,
        status,
        priority: typeof priority === "number" ? priority : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*, products(id, name, brand, image_url, price)")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, banner: mapBanner(banner) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить баннер." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("banners").delete().eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить баннер." }, { status: 500 });
  }
}
