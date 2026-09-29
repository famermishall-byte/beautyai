import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct, mapPromotion } from "@/lib/supabase";
import { applyActivePromotion, indexPromotionsByProduct } from "@/lib/apply-promotion";
import type { CartItem, Product } from "@/types";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Корзина пользователя с актуальными ценами из каталога (включая активные акции). Одна функция и для
 * показа корзины (GET /api/cart), и для оформления (POST /api/orders) — сумма в заказе всегда совпадает
 * с тем, что клиент видел, и никогда не берётся из запроса клиента.
 */
export async function loadCart(
  supabase: ServerSupabase,
  userId: string,
  storeId: string,
  opts: { selectedOnly?: boolean } = {}
): Promise<CartItem[]> {
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

  return (data ?? []).flatMap((row) => {
    const p = row.products as unknown as Record<string, unknown> | null;
    if (!p || p.store_id !== storeId) return [];
    return [
      {
        product: applyActivePromotion(mapProduct(p) as Product, promotions),
        quantity: row.quantity as number,
        selected: row.selected as boolean,
      },
    ];
  });
}
