import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import {
  mappingFromHeaderNames,
  missingRequiredColumns,
  planSyncRows,
  SYNC_IMPORT_FIELDS,
  detectFormatFromContentType,
  parseFile,
  type HeaderMapping,
  type RawTable,
  type ImportFormat,
} from "@/lib/import";
import { isSafeExternalUrl } from "@/lib/import/safeUrl";
import { executeSyncPlan } from "@/lib/import/executeSync";

/**
 * Runs one sync for a source (a row in `import_templates`, doubling as the
 * "connected source" record — see PROJECT_CONTEXT / the sources admin page).
 * For a `'file'` source the caller has already parsed the uploaded file
 * client-side and posts the raw table; for an `'api'` source this route
 * fetches connection_config.url itself. Either way the same matching/upsert
 * plan (src/lib/import/sync.ts) decides what happens to each row, and
 * nothing here ever guesses a merge it isn't sure about — see
 * import_review_items for what happens instead.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  }
  if (!isStoreManager(profile.role)) {
    return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: source, error: sourceError } = await supabase
    .from("import_templates")
    .select("id, column_mapping, connection_type, connection_config")
    .eq("id", id)
    .eq("store_id", profile.storeId)
    .maybeSingle();
  if (sourceError) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
  if (!source) {
    return NextResponse.json({ error: "Источник не найден." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const connectionConfig = (source.connection_config ?? {}) as Record<string, unknown>;

  let table: RawTable;
  if (source.connection_type === "api") {
    const url = typeof connectionConfig.url === "string" ? connectionConfig.url : "";
    if (!url || !isSafeExternalUrl(url)) {
      return NextResponse.json({ error: "У источника не настроен корректный адрес API." }, { status: 400 });
    }

    let response: Response;
    try {
      const headers: Record<string, string> = {};
      const headerName = connectionConfig.authHeaderName;
      const headerValue = connectionConfig.authHeaderValue;
      if (typeof headerName === "string" && headerName && typeof headerValue === "string" && headerValue) {
        headers[headerName] = headerValue;
      }
      response = await fetch(url, { headers, cache: "no-store" });
    } catch {
      return NextResponse.json({ error: "Не удалось подключиться к источнику по указанному адресу." }, { status: 502 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: `Источник ответил с ошибкой (${response.status}).` }, { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    const format: ImportFormat | null =
      (typeof connectionConfig.format === "string" ? (connectionConfig.format as ImportFormat) : null) ??
      detectFormatFromContentType(response.headers.get("content-type"));
    if (!format) {
      return NextResponse.json(
        { error: "Не удалось определить формат ответа источника — укажите формат (CSV/JSON) в настройках источника." },
        { status: 400 }
      );
    }
    try {
      table = parseFile(format, buffer);
    } catch {
      return NextResponse.json({ error: "Не удалось разобрать ответ источника." }, { status: 400 });
    }
  } else {
    if (!body.table || !Array.isArray(body.table.headers) || !Array.isArray(body.table.rows)) {
      return NextResponse.json({ error: "Не передан файл для синхронизации." }, { status: 400 });
    }
    table = body.table as RawTable;
  }

  if (table.headers.length === 0 || table.rows.length === 0) {
    return NextResponse.json({ error: "Источник не вернул ни одной строки с товарами." }, { status: 400 });
  }

  // Used right after creating an API source, before a mapping is saved yet:
  // fetch + parse only, so the admin UI can run suggestMapping() locally and
  // show the same mapping editor the file flow uses, without executing anything.
  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      preview: { headers: table.headers, sampleRows: table.rows.slice(0, 5) },
    });
  }

  const headerMapping: HeaderMapping =
    (body.columnMapping as HeaderMapping | undefined) ?? (source.column_mapping as HeaderMapping) ?? {};
  const columnMapping = mappingFromHeaderNames(headerMapping, table.headers);
  const missing = missingRequiredColumns(columnMapping, SYNC_IMPORT_FIELDS);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Не удалось сопоставить обязательные поля: ${missing.join(
          ", "
        )}. Обновите сопоставление колонок для этого источника и запустите синхронизацию заново.`,
      },
      { status: 400 }
    );
  }

  if (body.saveMapping) {
    await supabase
      .from("import_templates")
      .update({ column_mapping: headerMapping })
      .eq("id", id)
      .eq("store_id", profile.storeId);
  }

  const [{ data: existingProducts, error: productsError }, { data: branchRows, error: branchesError }] =
    await Promise.all([
      supabase.from("products").select("id, sku, barcode, external_id").eq("store_id", profile.storeId),
      supabase.from("branches").select("id, name").eq("store_id", profile.storeId),
    ]);
  if (productsError || branchesError) {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }

  const branchList = (branchRows ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
  const requestedBranchId = typeof body.branchId === "string" ? body.branchId : null;
  const configuredDefaultBranchId =
    typeof connectionConfig.defaultBranchId === "string" ? connectionConfig.defaultBranchId : null;
  const defaultBranchId =
    requestedBranchId ?? configuredDefaultBranchId ?? (branchList.length === 1 ? branchList[0].id : null);

  const plan = planSyncRows(table, columnMapping, {
    existingProducts: (existingProducts ?? []).map((p) => ({
      id: p.id as string,
      sku: p.sku as string,
      barcode: p.barcode as string | null,
      externalId: p.external_id as string | null,
    })),
    branches: branchList,
    defaultBranchId,
  });

  const errorRows = plan.filter((o) => o.kind === "error");

  let summary;
  try {
    summary = await executeSyncPlan(supabase, profile.storeId, id, plan);
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить результаты синхронизации." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    summary,
    errors: errorRows.map((e) => (e.kind === "error" ? { rowNumber: e.rowNumber, errors: e.errors } : null)).filter(Boolean),
  });
}
