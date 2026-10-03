import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { BACKUP_TABLES, backupFileName, fetchAllRows } from "@/lib/backup";

// Копия данных магазина одним файлом JSON — только владелец. В файле личные данные покупателей, адреса и
// ссылки заказов, поэтому читаем сервисным ключом только после проверки роли и отдаём без кэширования.
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const service = createServiceSupabaseClient();
  if (!service) return NextResponse.json({ error: "На сервере не настроен сервисный ключ." }, { status: 503 });

  try {
    const tables: Record<string, unknown[]> = {};
    for (const { name, orderBy } of BACKUP_TABLES) {
      tables[name] = await fetchAllRows(async (from, to) => {
        let query = service.from(name).select("*");
        for (const column of orderBy) query = query.order(column);
        const { data, error } = await query.range(from, to);
        if (error) throw new Error(`${name}: ${error.message}`);
        return data ?? [];
      });
    }

    const now = new Date();
    const counts = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
    const body = JSON.stringify({ app: "beauty", createdAt: now.toISOString(), counts, tables });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backupFileName(now)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("backup failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Не удалось собрать копию. Попробуйте ещё раз." }, { status: 500 });
  }
}
