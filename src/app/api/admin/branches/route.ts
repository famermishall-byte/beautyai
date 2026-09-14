import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapBranch } from "@/lib/supabase";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branches, error } = await supabase
      .from("branches")
      .select("*")
      .eq("store_id", profile.storeId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ branches: branches.map(mapBranch) });
  } catch {
    return NextResponse.json({ branches: [], error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const body = await request.json();
  const { name, address, phone, whatsapp, hours } = body;

  if (!name || !address || !phone || !whatsapp || !hours) {
    return NextResponse.json({ error: "Заполните все поля филиала." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: branch, error } = await supabase
      .from("branches")
      .insert({ store_id: profile.storeId, name, address, phone, whatsapp, hours })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, branch: mapBranch(branch) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить филиал." }, { status: 500 });
  }
}
