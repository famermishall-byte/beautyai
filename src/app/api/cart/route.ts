import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { loadCart } from "@/lib/cart-server";

// Корзина за аккаунтом — тот же подход, что /api/mybag: RLS пускает только к своим строкам,
// user_id всегда из сессии.

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });
  try {
    const supabase = await createServerSupabaseClient();
    const { items, threshold } = await loadCart(supabase, profile.userId, profile.storeId);
    return NextResponse.json({ items, wholesaleThreshold: threshold });
  } catch {
    return NextResponse.json({ error: "База данных недоступна." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productId = body.productId;
  const quantity = body.quantity;
  if (typeof productId !== "string" || !productId || typeof quantity !== "number" || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: "Неверные данные корзины." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (quantity <= 0) {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", profile.userId).eq("product_id", productId);
    if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: product } = await supabase.from("products").select("id").eq("id", productId).eq("store_id", profile.storeId).maybeSingle();
  if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });

  // upsert пишет только quantity/updated_at: у нового товара selected возьмёт default true,
  // у уже лежащего галочка не меняется.
  const { error } = await supabase
    .from("cart_items")
    .upsert(
      { user_id: profile.userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
      { onConflict: "user_id,product_id" }
    );
  if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const productIds = body.productIds;
  const selected = body.selected;
  const validIds = productIds === "all" || (Array.isArray(productIds) && productIds.every((id: unknown) => typeof id === "string"));
  if (!validIds || typeof selected !== "boolean") {
    return NextResponse.json({ error: "Неверные данные корзины." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("cart_items").update({ selected, updated_at: new Date().toISOString() }).eq("user_id", profile.userId);
  if (productIds !== "all") query = query.in("product_id", productIds);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Не удалось обновить корзину." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Не указан товар." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("cart_items").delete().eq("user_id", profile.userId).eq("product_id", productId);
  if (error) return NextResponse.json({ error: "Не удалось удалить товар." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
