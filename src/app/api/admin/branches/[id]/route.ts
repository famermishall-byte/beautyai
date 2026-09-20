import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBranch } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, city, address, phone, whatsapp, hours } = body;

  if (!name || !city || !address || !phone || !whatsapp || !hours) {
    return NextResponse.json({ error: "Заполните все поля филиала." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branch, error } = await supabase
      .from("branches")
      .update({ name, city, address, phone, whatsapp, hours })
      .eq("id", id)
      .eq("store_id", profile.storeId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, branch: mapBranch(branch) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить филиал." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("id", id)
      .eq("store_id", profile.storeId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить филиал." }, { status: 500 });
  }
}
