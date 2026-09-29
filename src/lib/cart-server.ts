import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct, mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import { mapWholesaleSettings, thresholdSom, wholesaleCandidate, type WholesaleSettings } from "@/lib/wholesale";
import type { CartItem, Product } from "@/types";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Настройки опта магазина (колонки stores, см. supabase/wholesale.sql); нет строки — опт выключен. */
export async function loadWholesaleSettings(supabase: ServerSupabase, storeId: string): Promise<WholesaleSettings> {
  const { data } = await supabase
    .from("stores")
    .select("wholesale_mode, wholesale_percent, wholesale_threshold_usd, usd_rate")
    .eq("id", storeId)
    .maybeSingle();
  return mapWholesaleSettings(data);
}

/**
 * Корзина пользователя с актуальными ценами из каталога (включая активные акции) и оптовой ценой-кандидатом у
 * каждого товара. Одна функция и для показа корзины (GET /api/cart), и для оформления (POST /api/orders) —
 * сумма в заказе всегда совпадает с тем, что клиент видел, и никогда не берётся из запроса клиента.
 * `threshold` — порог опта в сомах (null — опт не действует); пересчёт делает applyWholesale().
 */
export async function loadCart(
  supabase: ServerSupabase,
  userId: string,
  storeId: string,
  opts: { selectedOnly?: boolean } = {}
): Promise<{ items: CartItem[]; threshold: number | null }> {
  let query = supabase
    .from("cart_items")
    .select("quantity, selected, products(*)")
    .eq("user_id", userId)
    .order("created_at");
  if (opts.selectedOnly) query = query.eq("selected", true);
  const { data, error } = await query;
  if (error) throw error;

  const { data: promoRows } = await supabase
    .from("promotions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "active")
    .not("product_id", "is", null);
  const promotions = indexPromotionsByProduct((promoRows ?? []).map(mapPromotion));
  const settings = await loadWholesaleSettings(supabase, storeId);

  const items = (data ?? []).flatMap((row) => {
    const p = row.products as unknown as Record<string, unknown> | null;
    if (!p || p.store_id !== storeId) return [];
    const own = p.wholesale_price === null || p.wholesale_price === undefined ? null : Number(p.wholesale_price);
    const product = applyActivePromotion(mapProduct(p) as Product, promotions);
    // Оптовая цена считается от каталожной цены (до акции); с акцией сравнивает applyWholesale.
    return [
      {
        product: { ...product, wholesalePrice: wholesaleCandidate(Number(p.price), own, settings) },
        quantity: row.quantity as number,
        selected: row.selected as boolean,
      },
    ];
  });
  return { items, threshold: thresholdSom(settings) };
}
