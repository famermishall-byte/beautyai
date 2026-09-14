import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("import_templates")
    .delete()
    .eq("id", id)
    .eq("store_id", profile.storeId);

  if (error) {
    return NextResponse.json({ error: "Не удалось удалить шаблон." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
