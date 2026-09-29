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

  try {
    const supabase = await createServerSupabaseClient();
    const { data: cur } = await supabase.from("home_slides").select("placement").eq("id", id).eq("store_id", profile.storeId).maybeSingle();
    if (!cur) return NextResponse.json({ error: "Слайд не найден." }, { status: 404 });
    const placement = cur.placement === "inline" ? "inline" : "hero";

    let update: Record<string, unknown>;
    if (body.mediaType === undefined) {
      update = {};
      if (typeof body.active === "boolean") update.active = body.active;
      if (typeof body.priority === "number" && Number.isFinite(body.priority)) update.priority = Math.round(body.priority);
      if (Object.keys(update).length === 0) return NextResponse.json({ error: "Нечего сохранять." }, { status: 400 });
    } else {
      // Placement не меняется: валидируем по текущему значению строки.
      const parsed = slideRowFromBody({ ...body, placement });
      if (!parsed.ok) return NextResponse.json({ error: SLIDE_INPUT_ERRORS[parsed.error] }, { status: 400 });
      const { placement: _placement, ...fields } = parsed.row;
      void _placement;
      update = fields;
      if (typeof body.active === "boolean") update.active = body.active;
    }

    // Включение inline-баннера выключает остальные inline магазина (не больше одного активного).
    if (update.active === true && placement === "inline") {
      const { error: offError } = await supabase
        .from("home_slides")
        .update({ active: false })
        .eq("store_id", profile.storeId)
        .eq("placement", "inline")
        .eq("active", true)
        .neq("id", id);
      if (offError) throw offError;
    }
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
