import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  return NextResponse.json({ name: profile.storeName, slug: profile.storeSlug });
}

export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const body = await request.json();
  const name: string = (body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Название магазина не может быть пустым." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("stores")
      .update({ name })
      .eq("id", profile.storeId);

    if (error) throw error;

    return NextResponse.json({ ok: true, name });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить название магазина." }, { status: 500 });
  }
}
