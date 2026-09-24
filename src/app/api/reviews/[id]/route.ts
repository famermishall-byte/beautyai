import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

// Разрешение проверяет RLS-политика product_reviews_delete (свой отзыв, либо admin/owner
// своего магазина) — здесь просто выполняем запрос от имени вошедшего пользователя.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error, count } = await supabase.from("product_reviews").delete({ count: "exact" }).eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    if (!count) return NextResponse.json({ error: "Отзыв не найден или нет доступа." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить отзыв." }, { status: 500 });
  }
}
