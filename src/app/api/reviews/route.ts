import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProductReview } from "@/lib/supabase";
import { getSessionProfile } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Не указан товар." }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();

    const { data: rows, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("store_id", profile.storeId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id as string))];
    const { data: authors } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string | null }[] };
    const nameById = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

    const reviews = (rows ?? []).map((row) => mapProductReview(row, nameById.get(row.user_id as string) ?? null, profile.userId));
    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : null;

    // Товар куплен (не отменённый заказ, товар есть в items_json) и ещё не отрецензирован этим
    // заказом — тогда клиент может оставить отзыв. См. POST ниже: сервер сам выбирает order_id,
    // клиенту выбирать нечего.
    const { data: orders } = await supabase
      .from("orders")
      .select("id, items_json, status")
      .eq("user_id", profile.userId)
      .eq("store_id", profile.storeId)
      .neq("status", "cancelled");
    const reviewedOrderIds = new Set(reviews.filter((r) => r.userId === profile.userId).map((r) => r.orderId));
    const ordersWithProduct = (orders ?? []).filter((o) => {
      const items = (o.items_json ?? []) as { productId?: string }[];
      return items.some((i) => i.productId === productId);
    });
    const eligibleOrderIds = ordersWithProduct.map((o) => o.id as string).filter((id) => !reviewedOrderIds.has(id));
    const canReview = eligibleOrderIds.length > 0;
    const reason = canReview ? null : ordersWithProduct.length === 0 ? "no-purchase" : "already-reviewed";

    return NextResponse.json({ reviews, average, count, canReview, reason });
  } catch {
    return NextResponse.json({ reviews: [], average: null, count: 0, canReview: false, error: "База данных недоступна." });
  }
}

export async function POST(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Не авторизовано." }, { status: 401 });

  const body = await request.json();
  const productId: string | undefined = body.productId;
  const rating = Number(body.rating);
  const comment: string = (body.comment ?? "").trim();

  if (!productId) return NextResponse.json({ error: "Не указан товар." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Оценка должна быть от 1 до 5 звёзд." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: orders } = await supabase
      .from("orders")
      .select("id, items_json")
      .eq("user_id", profile.userId)
      .eq("store_id", profile.storeId)
      .neq("status", "cancelled");
    const { data: existing } = await supabase
      .from("product_reviews")
      .select("order_id")
      .eq("user_id", profile.userId)
      .eq("product_id", productId);
    const reviewedOrderIds = new Set((existing ?? []).map((r) => r.order_id as string));

    const eligibleOrder = (orders ?? []).find((o) => {
      if (reviewedOrderIds.has(o.id as string)) return false;
      const items = (o.items_json ?? []) as { productId?: string }[];
      return items.some((i) => i.productId === productId);
    });
    if (!eligibleOrder) {
      return NextResponse.json({ error: "Доступно только по своей покупке этого товара." }, { status: 403 });
    }

    const { data: row, error } = await supabase
      .from("product_reviews")
      .insert({
        store_id: profile.storeId,
        product_id: productId,
        user_id: profile.userId,
        order_id: eligibleOrder.id,
        rating,
        comment: comment || null,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, review: mapProductReview(row, profile.displayName, profile.userId) });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить отзыв — база данных недоступна." }, { status: 500 });
  }
}
