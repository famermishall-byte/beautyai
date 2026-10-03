import { NextResponse } from "next/server";
import { getSessionProfile, isStoreManager } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

// Служебная проверка для владельца и администратора: настроен ли на сервере сервисный ключ и рабочий ли он.
// Сам ключ не возвращается — только «да/нет». Нужна перед запуском supabase/orders_insert_server_only.sql:
// без рабочего ключа оформление заказов после него перестало бы работать.
export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  if (!isStoreManager(profile.role)) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });

  const service = createServiceSupabaseClient();
  if (!service) return NextResponse.json({ serviceKeyConfigured: false, serviceKeyWorks: false });

  // Таблица счётчиков закрыта для всех, кроме сервисного ключа: если чтение прошло — ключ настоящий.
  const { error } = await service.from("store_order_counters").select("store_id", { count: "exact", head: true });
  return NextResponse.json({ serviceKeyConfigured: true, serviceKeyWorks: !error });
}
