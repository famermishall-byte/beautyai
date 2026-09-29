import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { slideRowFromBody, SLIDE_INPUT_ERRORS } from "@/lib/home-slides";

// PUT: полная форма слайда либо частично { active } / { priority } (показать/скрыть, порядок).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Пустой запрос." }, { status: 400 });

  let update: Record<string, unknown>;
  if (body.mediaType === undefined) {
    update = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.priority === "number" && Number.isFinite(body.priority)) update.priority = Math.round(body.priority);
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Нечего сохранять." }, { status: 400 });
  } else {
    const parsed = slideRowFromBody(body);
    if (!parsed.ok) return NextResponse.json({ error: SLIDE_INPUT_ERRORS[parsed.error] }, { status: 400 });
    update = { ...parsed.row };
    if (typeof body.active === "boolean") update.active = body.active;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("home_slides")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: "Слайд не найден." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить слайд." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("home_slides").delete().eq("id", id).eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить слайд." }, { status: 500 });
  }
}
