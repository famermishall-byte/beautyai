import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { LIMITS } from "@/lib/limits";

// Сколько позиций из старой корзины переносим за раз (в нормальной корзине их единицы).
const MAX_MERGE_ITEMS = 200;

// Одноразовый перенос старой корзины из localStorage телефона в аккаунт: количества складываются
// с тем, что уже лежит в корзине аккаунта; товары чужого магазина / удалённые — пропускаются.
export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const incoming: { productId: string; quantity: number }[] = (Array.isArray(body.items) ? body.items : []).filter(
    (i: { productId?: unknown; quantity?: unknown }) =>
      typeof i?.productId === "string" && typeof i?.quantity === "number" && Number.isInteger(i.quantity) && i.quantity > 0
  ).slice(0, MAX_MERGE_ITEMS);
  if (incoming.length === 0) return NextResponse.json({ ok: true });

  const supabase = await createServerSupabaseClient();
  const ids = incoming.map((i) => i.productId);
  const { data: known } = await supabase.from("products").select("id").eq("store_id", profile.storeId).in("id", ids);
  const knownIds = new Set((known ?? []).map((p) => p.id as string));

  const { data: existing } = await supabase.from("cart_items").select("product_id, quantity").eq("user_id", profile.userId).in("product_id", ids);
  const existingQty = new Map((existing ?? []).map((r) => [r.product_id as string, r.quantity as number]));

  const rows = incoming
    .filter((i) => knownIds.has(i.productId))
    .map((i) => ({
      user_id: profile.userId,
      product_id: i.productId,
      quantity: Math.min(LIMITS.maxQuantity, (existingQty.get(i.productId) ?? 0) + i.quantity),
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("cart_items").upsert(rows, { onConflict: "user_id,product_id" });
  if (error) return NextResponse.json({ error: "Не удалось перенести корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
