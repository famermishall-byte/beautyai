import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import {
  mappingFromHeaderNames,
  missingRequiredColumns,
  planSyncRows,
  SYNC_IMPORT_FIELDS,
  detectFormatFromContentType,
  parseFile,
  type HeaderMapping,
  type ImportFormat,
} from "@/lib/import";
import { isSafeExternalUrl } from "@/lib/import/safeUrl";
import { executeSyncPlan } from "@/lib/import/executeSync";

/**
 * Scheduled sync for every 'api'-type source, across every store. There's no
 * logged-in admin here for RLS to key off of, so this needs a Supabase
 * service-role key — SUPABASE_SERVICE_ROLE_KEY, added as a Vercel env var by
 * the project owner (a secret this assistant can't generate or fetch on its
 * own; find it in the Supabase dashboard under Project Settings > API).
 * Without it this route just reports that scheduled sync isn't configured
 * yet — manual "Синхронизировать сейчас" doesn't need this key at all, since
 * it runs under the admin's own session.
 *
 * Wired into vercel.json's `crons` (daily — the Hobby plan's own scheduler
 * doesn't support a shorter interval). For a true 15/30-minute refresh
 * without upgrading the Vercel plan, point a free external pinger (e.g.
 * cron-job.org) at this same URL with the same Authorization header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason:
        "SUPABASE_SERVICE_ROLE_KEY не настроен — добавьте его в переменные окружения проекта на Vercel, чтобы включить синхронизацию по расписанию.",
    });
  }

  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  const { data: sources, error } = await supabase
    .from("import_templates")
    .select("id, store_id, column_mapping, connection_config")
    .eq("connection_type", "api");

  if (error) {
    return NextResponse.json({ error: "Не удалось получить список источников." }, { status: 500 });
  }

  const results: Record<string, unknown>[] = [];

  for (const source of sources ?? []) {
    const sourceId = source.id as string;
    const storeId = source.store_id as string;
    const connectionConfig = (source.connection_config ?? {}) as Record<string, unknown>;
    const url = typeof connectionConfig.url === "string" ? connectionConfig.url : "";

    if (!url || !isSafeExternalUrl(url)) {
      results.push({ sourceId, ok: false, reason: "invalid_url" });
      continue;
    }

    try {
      const headers: Record<string, string> = {};
      const headerName = connectionConfig.authHeaderName;
      const headerValue = connectionConfig.authHeaderValue;
      if (typeof headerName === "string" && headerName && typeof headerValue === "string" && headerValue) {
        headers[headerName] = headerValue;
      }

      const response = await fetch(url, { headers, cache: "no-store" });
      if (!response.ok) {
        results.push({ sourceId, ok: false, reason: `http_${response.status}` });
        continue;
      }

      const buffer = await response.arrayBuffer();
      const format: ImportFormat | null =
        (typeof connectionConfig.format === "string" ? (connectionConfig.format as ImportFormat) : null) ??
        detectFormatFromContentType(response.headers.get("content-type"));
      if (!format) {
        results.push({ sourceId, ok: false, reason: "unknown_format" });
        continue;
      }

      const table = parseFile(format, buffer);
      if (table.headers.length === 0 || table.rows.length === 0) {
        results.push({ sourceId, ok: false, reason: "empty_response" });
        continue;
      }

      const headerMapping = (source.column_mapping ?? {}) as HeaderMapping;
      const columnMapping = mappingFromHeaderNames(headerMapping, table.headers);
      const missing = missingRequiredColumns(columnMapping, SYNC_IMPORT_FIELDS);
      if (missing.length > 0) {
        results.push({ sourceId, ok: false, reason: `missing_fields: ${missing.join(", ")}` });
        continue;
      }

      const [{ data: existingProducts }, { data: branchRows }] = await Promise.all([
        supabase.from("products").select("id, sku, barcode, external_id").eq("store_id", storeId),
        supabase.from("branches").select("id, name").eq("store_id", storeId),
      ]);
      const branchList = (branchRows ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
      const configuredDefaultBranchId =
        typeof connectionConfig.defaultBranchId === "string" ? connectionConfig.defaultBranchId : null;
      const defaultBranchId = configuredDefaultBranchId ?? (branchList.length === 1 ? branchList[0].id : null);

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

      const summary = await executeSyncPlan(supabase, storeId, sourceId, plan);
      results.push({ sourceId, ok: true, summary });
    } catch (err) {
      results.push({ sourceId, ok: false, reason: err instanceof Error ? err.message : "unknown_error" });
    }
  }

  return NextResponse.json({ ok: true, sourcesProcessed: results.length, results });
}
