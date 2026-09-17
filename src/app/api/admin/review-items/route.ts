import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("import_review_items")
    .select("id, source_id, raw_row, reason, status, created_at")
    .eq("store_id", profile.storeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((r) => ({
      id: r.id,
      sourceId: r.source_id,
      rawRow: r.raw_row,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}
