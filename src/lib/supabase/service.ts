import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Серверный клиент с сервисным ключом: пишет в базу в обход правил доступа (RLS).
 * ТОЛЬКО для кода на сервере (маршруты /api) и только после того, как сервер сам проверил, кто спрашивает
 * и что именно записывается. В клиентский код не импортировать: ключ даёт полный доступ к базе.
 *
 * Ключ — переменная SUPABASE_SERVICE_ROLE_KEY в настройках Vercel. Пока её нет, возвращает null, и вызывающий
 * код работает по-старому, через сессию покупателя.
 */
export function createServiceSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
