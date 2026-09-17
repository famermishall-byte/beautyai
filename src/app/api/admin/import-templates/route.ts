import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("import_templates")
    .select(
      "id, name, source_type, column_mapping, connection_type, connection_config, last_synced_at, last_sync_summary, created_at"
    )
    .eq("store_id", profile.storeId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }

  return NextResponse.json({
    templates: (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      sourceType: t.source_type,
      columnMapping: t.column_mapping,
      connectionType: t.connection_type,
      connectionConfig: t.connection_config,
      lastSyncedAt: t.last_synced_at,
      lastSyncSummary: t.last_sync_summary,
      createdAt: t.created_at,
    })),
  });
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
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sourceType = typeof body.sourceType === "string" ? body.sourceType : "xlsx";
  const columnMapping = body.columnMapping;
  const connectionType = body.connectionType === "api" ? "api" : "file";
  const connectionConfig = body.connectionConfig && typeof body.connectionConfig === "object" ? body.connectionConfig : null;

  if (!name) {
    return NextResponse.json({ error: "Укажите название источника." }, { status: 400 });
  }
  if (!columnMapping || typeof columnMapping !== "object") {
    return NextResponse.json({ error: "Некорректное сопоставление колонок." }, { status: 400 });
  }
  if (connectionType === "api" && !connectionConfig?.url) {
    return NextResponse.json({ error: "Укажите адрес (URL), с которого получать данные." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("import_templates")
    .insert({
      store_id: profile.storeId,
      name,
      source_type: sourceType,
      column_mapping: columnMapping,
      connection_type: connectionType,
      connection_config: connectionConfig,
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Не удалось сохранить шаблон." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
