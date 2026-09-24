import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

// PUT меняет только priority — используется для стрелок вверх/вниз в NewArrivalsManager.tsx
// (меняет местами priority с соседом, поэтому оба запроса идут по одному и тому же маршруту).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const priority = Number(body.priority);
  if (!Number.isFinite(priority)) return NextResponse.json({ error: "Некорректный порядок." }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("new_arrivals").update({ priority }).eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось изменить порядок." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("new_arrivals").delete().eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось убрать товар." }, { status: 500 });
  }
}
